import React, { useRef, useEffect } from "react";
import Rete from "rete";
import ReteReactRenderPlugin from "rete-react-render-plugin";
import ReteConnectionPlugin from "rete-connection-plugin";
import ReteContextMenuPlugin from "rete-context-menu-plugin";
import getOr from "lodash/fp/getOr";

import StylizedNode from "./node/stylized-node";
import valueSocket from "./socket/value";

import VirtualConnectionPlugin, {
  withVirtualConnections
} from "./plugin/virtual-connection";

import "./app.css";

class LogComponent extends Rete.Component {
  constructor() {
    super("Log");

    this.data.component = StylizedNode;
  }

  builder(node) {
    node.addInput(new Rete.Input("inData", "Data", valueSocket));
  }

  worker(node, inputs, outputs) {
    console.log("LOG", inputs["inData"] && inputs["inData"][0]);
    return outputs;
  }
}

class Log2Component extends Rete.Component {
  constructor() {
    super("Log2");

    this.data.component = StylizedNode;
  }

  builder(node) {
    node.addInput(new Rete.Input("inData", "Data", valueSocket));
  }

  worker(node, inputs, outputs) {
    console.log("LOG2", inputs["inData"] && inputs["inData"][0]);
    return outputs;
  }
}

class DummyArrayComponent extends Rete.Component {
  constructor() {
    super("Dummy Array");

    this.data.component = StylizedNode;
  }

  builder(node) {
    node.addOutput(new Rete.Output("outArray", "Array", valueSocket));
  }

  worker(node, inputs, outputs) {
    outputs.outArray = [1, 2, 3, 4, 5, 6, 7];
    return outputs;
  }
}

class DummyNumberComponent extends Rete.Component {
  constructor() {
    super("Dummy Number");

    this.data.component = StylizedNode;
  }

  builder(node) {
    node.addOutput(new Rete.Output("outNumber", "Number", valueSocket));
  }

  worker(node, inputs, outputs) {
    outputs.outNumber = 42;
    return outputs;
  }
}

class IdentityComponent extends Rete.Component {
  constructor() {
    super("Identity");

    this.data.component = StylizedNode;
  }

  builder(node) {
    node.addInput(new Rete.Input("inData", "Data", valueSocket));
    node.addOutput(new Rete.Output("outData", "Data", valueSocket));
  }

  worker(node, inputs, outputs) {
    outputs.outData = inputs["inData"] && inputs["inData"][0];
    return outputs;
  }
}

class ForEachComponent extends Rete.Component {
  constructor() {
    super("ForEach");

    this.data.component = StylizedNode;

    this.virtualConnections = {
      outputs: ["outElement"]
    };
  }

  builder(node) {
    node.addInput(new Rete.Input("inArray", "Array", valueSocket));
    node.addOutput(new Rete.Output("outElement", "Element", valueSocket));
    node.addOutput(new Rete.Output("outArray", "Array", valueSocket));
  }

  async worker(node, inputs, outputs) {
    const inputArray = getOr([], "inArray.0")(inputs);

    await node
      .withVirtualOutput("outElement")
      .forEachOutputNode(async (processNode) => {
        for (let index = 0; index < inputArray.length; index++) {
          await processNode(inputArray[index]);
        }
      });

    outputs.outArray = inputArray;
    return outputs;
  }
}

const RETE_ID = "test@0.0.1";

const PLUGINS = [
  ReteConnectionPlugin,
  ReteContextMenuPlugin,
  ReteReactRenderPlugin,
  VirtualConnectionPlugin
];

const COMPONENTS = [
  new LogComponent(),
  new Log2Component(),
  new DummyArrayComponent(),
  new DummyNumberComponent(),
  new IdentityComponent(),
  new ForEachComponent()
];

function Playground2() {
  const reteRef = useRef(null);

  useEffect(() => {
    const { current: reteElm } = reteRef;
    if (reteElm) {
      const editor = new Rete.NodeEditor(RETE_ID, reteElm);
      const engine = new Rete.Engine(RETE_ID);

      PLUGINS.forEach((plugin) => {
        editor.use(plugin, { engine });
      });

      COMPONENTS.forEach((component) => {
        editor.register(component);
        engine.register(component);
      });

      withVirtualConnections({ engine, editor });
    }
  }, []);

  return <div className="rete-container" ref={reteRef} />;
}

export default Playground2;
