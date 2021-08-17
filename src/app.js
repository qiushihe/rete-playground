import React, { useRef, useEffect } from "react";
import Rete from "rete";
import ReteReactRenderPlugin from "rete-react-render-plugin";
import ReteConnectionPlugin from "rete-connection-plugin";
import ReteContextMenuPlugin from "rete-context-menu-plugin";
import ReteTaskPlugin from "rete-task-plugin";
import flow from "lodash/fp/flow";
import get from "lodash/fp/get";
import first from "lodash/fp/first";
import map from "lodash/fp/map";
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

class IdentityComponent extends Rete.Component {
  constructor() {
    super("Identity");

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
    return { outData: val };
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

  worker(node, inputs, outputs) {
    console.log("LOG", inputs["inData"] && inputs["inData"][0]);
    return outputs;
  }
}

class ForEach extends Rete.Component {
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
    const { outElement } = outputs;

    if (outElement === undefined) {
      await Promise.all(
        flow([
          get("inArray"),
          first,
          map((el) => {
            return this.clone().run({ outElement: el });
          })
        ])(inputs)
      );

      this.closed = ["outIterator"];
    } else {
      this.closed = ["outAction"];
      return outputs;
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

  async worker(node, inputs, outputs) {
    await new Promise(defer);
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
        task.run({ __START: true }, false);
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

  async worker(node, inputs, outputs) {
    // This promise can be any async function.
    // However, it's important that an await is here to delay
    // the resolution of this async function otherwise things
    // wont work.
    await new Promise(defer);

    return {};
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
  new IdentityComponent(),
  new ReverseComponent(),
  new LogComponent(),
  new ForEach(),
  new DummyArrayComponent(),
  new StartComponent()
];

function App() {
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

export default App;
