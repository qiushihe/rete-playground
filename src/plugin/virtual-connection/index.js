import flow from "lodash/fp/flow";
import get from "lodash/fp/get";
import find from "lodash/fp/find";
import eq from "lodash/fp/eq";
import getOr from "lodash/fp/getOr";
import includes from "lodash/fp/includes";
import reduce from "lodash/fp/reduce";
import values from "lodash/fp/values";
import forEach from "lodash/fp/forEach";
import over from "lodash/fp/over";
import flatten from "lodash/fp/flatten";
import cond from "lodash/fp/cond";
import negate from "lodash/fp/negate";
import isNil from "lodash/fp/isNil";
import isFunction from "lodash/fp/isFunction";

const uncappedReduce = reduce.convert({ cap: false });

const updateIO = uncappedReduce((acc, input, key) => {
  const { concrete, virtual } = flow([
    get("connections"),
    reduce(
      ({ concrete, virtual }, connection) =>
        connection.data.__isVirtual
          ? {
              concrete,
              virtual: [...virtual, connection]
            }
          : {
              concrete: [...concrete, connection],
              virtual
            },
      { concrete: [], virtual: [] }
    )
  ])(input);

  return {
    ...acc,
    [key]: {
      ...input,
      connections: concrete,
      virtualConnections: virtual
    }
  };
}, {});

const updateData = (data) => ({
  ...data,
  nodes: flow([
    get("nodes"),
    uncappedReduce(
      (acc, node, nodeId) => ({
        ...acc,
        [nodeId]: {
          ...node,
          inputs: flow([get("inputs"), updateIO])(node),
          outputs: flow([get("outputs"), updateIO])(node)
        }
      }),
      {}
    )
  ])(data)
});

const clearOutputData = (node) => {
  delete node.outputData;
  return node;
};

const deepClearOutputData = (node, { engine } = {}) => {
  clearOutputData(node);

  flow([
    get("outputs"),
    values,
    forEach(
      flow([
        over([get("connections"), get("virtualConnections")]),
        flatten,
        forEach(
          flow([
            get("node"),
            (nodeId) => engine.data.nodes[nodeId],
            cond([
              [negate(isNil), (node) => deepClearOutputData(node, { engine })]
            ])
          ])
        )
      ])
    )
  ])(node);
};

export const withVirtualConnections = ({ engine, editor }) => {
  const originalExtractInputData = engine.extractInputData.bind(engine);
  engine.extractInputData = async ({ __inputData, ...node }) => {
    const extractedInputData = await originalExtractInputData(node);

    return uncappedReduce(
      (acc, value, key) => ({
        ...acc,
        [key]: [...(acc[key] || []), value]
      }),
      extractedInputData
    )(__inputData);
  };

  const originalProcessNode = engine.processNode.bind(engine);
  engine.processNode = async (node, inputData = null) => {
    node.outputData = await originalProcessNode({
      ...node,
      __inputData: inputData
    });

    return node.outputData;
  };

  engine.processUnreachable = () => Promise.resolve();

  editor.on(
    "process nodecreated noderemoved connectioncreated connectionremoved",
    async () => {
      await engine.abort();
      await engine.process(updateData(editor.toJSON()), 1);
    }
  );
};

const install = (editor, { engine } = {}) => {
  const findEditorNodeById = (id) => {
    return flow([get("nodes"), find(flow([get("id"), eq(id)]))])(editor);
  };

  const findEngineNodeById = (id) => {
    return flow([get("data.nodes"), values, find(flow([get("id"), eq(id)]))])(
      engine
    );
  };

  const processNodeTree = async (inputNode, inputData = null) => {
    deepClearOutputData(inputNode, { engine });
    await engine.processNode(inputNode, inputData);
    await engine.forwardProcess(inputNode);
  };

  const getVirtualConnection = (node) => (outputName) => ({
    forEachOutputNode: async (processorFn = null) => {
      if (!isFunction(processorFn)) {
        return;
      }

      const virtualConnections = getOr(
        [],
        `outputs.${outputName}.virtualConnections`
      )(node);

      for (
        let connectionIndex = 0;
        connectionIndex < virtualConnections.length;
        connectionIndex++
      ) {
        const connection = virtualConnections[connectionIndex];
        const inputNode = findEngineNodeById(connection.node);
        const inputDataKey = connection.input;

        await processorFn(async (inputData) => {
          await processNodeTree(inputNode, {
            [inputDataKey]: inputData
          });
        });
      }
    }
  });

  editor.on("componentregister", (component) => {
    const decorateNode = (node) => {
      node.virtualConnections = component.virtualConnections || {};
      node.withVirtualOutput = getVirtualConnection(node);
      return node;
    };

    // The `node` for `builder` is an "editor node".
    const originalBuilder = component.builder;
    component.builder = (node, ...restArgs) =>
      originalBuilder(decorateNode(node), ...restArgs);

    // The `node` for `worker` is a "engine node".
    const originalWorker = component.worker;
    component.worker = async (node, ...restArgs) =>
      originalWorker(decorateNode(node), ...restArgs);
  });

  editor.on("connectioncreated", (connection) => {
    const inputKey = connection.input.key;
    const outputKey = connection.output.key;

    // The `node` in the `connection` here is an "editor node" and not an "engine node".
    // So we have to find the nodes from the `editor`'s `nodes` array.
    const virtualInputs = flow([
      get("input.node.id"),
      findEditorNodeById,
      getOr([], "virtualConnections.inputs")
    ])(connection);

    const virtualOutputs = flow([
      get("output.node.id"),
      findEditorNodeById,
      getOr([], "virtualConnections.outputs")
    ])(connection);

    if (
      includes(inputKey)(virtualInputs) ||
      includes(outputKey)(virtualOutputs)
    ) {
      connection.data.__isVirtual = true;
    }
  });
};

const plugin = {
  name: "virtual-connections",
  install: install
};

export default plugin;
