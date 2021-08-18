import React, { useRef, useEffect } from "react";
import Rete from "rete";
import ReteReactRenderPlugin from "rete-react-render-plugin";
import ReteConnectionPlugin from "rete-connection-plugin";
import ReteContextMenuPlugin from "rete-context-menu-plugin";
import ReteTaskPlugin from "rete-task-plugin";
import get from "lodash/fp/get";
import defer from "lodash/fp/defer";
import reverse from "lodash/fp/reverse";

import StylizedNode from "./node/stylized-node";
import valueSocket from "./socket/value";

import actionSocket, {
  primaryFlowControl as primaryActionSocket
} from "./socket/action";

import "./app.css";

// Reference: https://codepen.io/Ni55aN/pen/KJVEMe

class ButtonReactControl extends React.PureComponent {
  render() {
    const { label, onClick } = this.props;

    return <button onClick={onClick}>{label}</button>;
  }
}

class ButtonControl extends Rete.Control {
  constructor(key, { label = "Button", onClick = () => {} } = {}) {
    super(key);
    this.render = "react";
    this.component = ButtonReactControl;
    this.props = { label, onClick };
  }
}

class ReverseComponent extends Rete.Component {
  constructor() {
    super("Reverse");

    this.data.component = StylizedNode;

    this.task = {
      outputs: {
        outData: "output"
      }
    };
  }
  builder(node) {
    node.addInput(new Rete.Input("inData", "Data", valueSocket));
    node.addOutput(new Rete.Output("outData", "Data", valueSocket));
  }

  worker(node, inputs) {
    const val = inputs["inData"] && inputs["inData"][0];
    return { outData: reverse(val) };
  }
}

class LogComponent extends Rete.Component {
  constructor() {
    super("Log");

    this.data.component = StylizedNode;

    this.task = {
      outputs: { outAction: "option" }
    };
  }

  builder(node) {
    node.addInput(new Rete.Input("inAction", "Action", primaryActionSocket));
    node.addInput(new Rete.Input("inData", "Data", valueSocket));
    node.addOutput(new Rete.Output("outAction", "Action", primaryActionSocket));
  }

  worker(node, inputs) {
    console.log("LOG", inputs["inData"] && inputs["inData"][0]);
  }
}

class Log2Component extends Rete.Component {
  constructor() {
    super("Log2");

    this.data.component = StylizedNode;

    this.task = {
      outputs: { outAction: "option" }
    };
  }

  builder(node) {
    node.addInput(new Rete.Input("inAction", "Action", primaryActionSocket));
    node.addInput(new Rete.Input("inData", "Data", valueSocket));
    node.addOutput(new Rete.Output("outAction", "Action", primaryActionSocket));
  }

  worker(node, inputs) {
    console.log("LOG2", inputs["inData"] && inputs["inData"][0]);
  }
}

class ForEachComponent extends Rete.Component {
  constructor() {
    super("ForEach");

    this.data.component = StylizedNode;

    this.task = {
      outputs: {
        outIterator: "option",
        outElement: "output",
        outAction: "option"
      }
    };
  }

  builder(node) {
    node.addInput(new Rete.Input("inAction", "Action", primaryActionSocket));
    node.addInput(new Rete.Input("inArray", "Array", valueSocket));
    node.addOutput(new Rete.Output("outIterator", "Iterator", actionSocket));
    node.addOutput(new Rete.Output("outElement", "Element", valueSocket));
    node.addOutput(new Rete.Output("outAction", "Done", primaryActionSocket));
  }

  async worker(node, inputs, outputs) {
    const { outElement, __index } = outputs || {};
    const isNodeWorker = outElement === undefined;
    const isLooping = __index !== undefined;

    if (isNodeWorker) {
      if (__index === undefined) {
        await this.clone().run({ __index: 0 });
      } else {
        const inputArray = get("inArray.0")(inputs) || [];

        if (__index < inputArray.length) {
          await this.clone().run({ outElement: inputArray[__index] });
          await this.clone().run({ __index: __index + 1 });
        }
      }

      if (isLooping) {
        this.closed = ["outAction", "outIterator"];
        return { __index };
      } else {
        this.closed = ["outIterator"];
        return null;
      }
    } else {
      this.closed = ["outAction"];
      return { outElement };
    }
  }
}

class DummyArrayComponent extends Rete.Component {
  constructor() {
    super("Dummy Array");

    this.data.component = StylizedNode;

    this.task = {
      outputs: { outArray: "output" }
    };
  }

  builder(node) {
    node.addOutput(new Rete.Output("outArray", "Array", valueSocket));
  }

  worker() {
    return { outArray: [1, 2, 3, 4, 5, 6, 7] };
  }
}

class StartComponent extends Rete.Component {
  constructor() {
    super("Start");

    this.data.component = StylizedNode;

    this.task = {
      outputs: { outAction: "option" },
      init(task) {
        task.run(null, false);
      }
    };
  }

  builder(node) {
    node.addControl(
      new ButtonControl(`${node.id}-re-run`, {
        label: "Re-Run",
        onClick: () => {
          this.editor.trigger("process");
        }
      })
    );
    node.addOutput(new Rete.Output("outAction", "Action", primaryActionSocket));
  }

  async worker() {
    // This promise can be any async function.
    // However, it's important that an await is here to delay
    // the resolution of this async function otherwise things
    // wont work.
    await new Promise(defer);

    return { __START: true };
  }
}

const RETE_ID = "test@0.0.1";

const PLUGINS = [
  ReteTaskPlugin,
  ReteConnectionPlugin,
  ReteContextMenuPlugin,
  ReteReactRenderPlugin
];

const COMPONENTS = [
  new ReverseComponent(),
  new LogComponent(),
  new Log2Component(),
  new ForEachComponent(),
  new DummyArrayComponent(),
  new StartComponent()
];

function Playground1() {
  const reteRef = useRef(null);

  useEffect(() => {
    const { current: reteElm } = reteRef;
    if (reteElm) {
      const editor = new Rete.NodeEditor(RETE_ID, reteElm);
      const engine = new Rete.Engine(RETE_ID);

      PLUGINS.forEach((plugin) => {
        editor.use(plugin);
      });

      COMPONENTS.forEach((component) => {
        editor.register(component);
        engine.register(component);
      });

      editor.on(
        "process nodecreated noderemoved connectioncreated connectionremoved",
        async () => {
          await engine.abort();
          await engine.process(editor.toJSON());
        }
      );
    }
  }, []);

  return <div className="rete-container" ref={reteRef} />;
}

export default Playground1;
