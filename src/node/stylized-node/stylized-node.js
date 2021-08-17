import React, { Children } from "react";
import { Control, Node, Socket } from "rete-react-render-plugin";
import flow from "lodash/fp/flow";
import map from "lodash/fp/map";
import isEmpty from "lodash/fp/isEmpty";
import filter from "lodash/fp/filter";
import get from "lodash/fp/get";
import eq from "lodash/fp/eq";
import negate from "lodash/fp/negate";
import overEvery from "lodash/fp/overEvery";
import compact from "lodash/fp/compact";

import { interleave } from "../../util/collection.util";
import { ACTION } from "../../enum/socket-type.enum";
import { PRIMARY_FLOW_CONTROL } from "../../enum/socket-category.enum";

import {
  Base,
  Spacer,
  Separator,
  Header,
  Icon,
  Title,
  Connections,
  ConnectionGroup,
  Connection,
  ConnectionLabel,
  Controls
} from "./stylized-node.style";

const isPrimaryFlowControl = overEvery([
  flow([get("socket.data.type"), eq(ACTION)]),
  flow([get("socket.data.category"), eq(PRIMARY_FLOW_CONTROL)])
]);

const filterPrimaryFlowControl = filter(isPrimaryFlowControl);

const filterRegular = filter(negate(isPrimaryFlowControl));

const connectionRenderer =
  ({ bindSocket, bindControl }) =>
  ({ inputs, outputs, category }) => {
    if (isEmpty(inputs) && isEmpty(outputs)) {
      return null;
    }

    return (
      <Connections data-category={category}>
        <ConnectionGroup $direction="input">
          {inputs.map((input) => (
            <Connection key={input.key}>
              <Socket
                type="input"
                socket={input.socket}
                io={input}
                innerRef={bindSocket}
              />
              {!input.showControl() && (
                <ConnectionLabel>{input.name}</ConnectionLabel>
              )}
              {input.showControl() && (
                <Control control={input.control} innerRef={bindControl} />
              )}
            </Connection>
          ))}
        </ConnectionGroup>
        <Spacer $direction="horizontal" $size={30} />
        <ConnectionGroup $direction="output">
          {outputs.map((output) => (
            <Connection key={output.key}>
              <ConnectionLabel>{output.name}</ConnectionLabel>
              <Socket
                type="output"
                socket={output.socket}
                io={output}
                innerRef={bindSocket}
              />
            </Connection>
          ))}
        </ConnectionGroup>
      </Connections>
    );
  };

class StylizedNode extends Node {
  render() {
    const { node, bindSocket, bindControl } = this.props;
    const { outputs, controls, inputs, selected } = this.state;

    const actionInputs = filterPrimaryFlowControl(inputs);
    const otherInputs = filterRegular(inputs);
    const actionOutputs = filterPrimaryFlowControl(outputs);
    const otherOutputs = filterRegular(outputs);

    const renderConnections = connectionRenderer({ bindSocket, bindControl });

    return (
      <Base $selected={selected}>
        <Header>
          <Icon />
          <Title>{node.name}</Title>
        </Header>
        <Spacer $direction="vertical" $size={8} />
        {flow([
          compact,
          interleave(
            <>
              <Spacer $direction="vertical" $size={4} />
              <Separator />
              <Spacer $direction="vertical" $size={4} />
            </>
          ),
          Children.toArray
        ])([
          renderConnections({
            inputs: actionInputs,
            outputs: [],
            category: "primary-flow-control-sockets"
          }),
          renderConnections({
            inputs: otherInputs,
            outputs: otherOutputs,
            category: "regular-sockets"
          }),
          renderConnections({
            inputs: [],
            outputs: actionOutputs,
            category: "primary-flow-control-sockets"
          })
        ])}
        {!isEmpty(controls) && (
          <>
            <Spacer $direction="vertical" $size={4} />
            <Separator />
            <Spacer $direction="vertical" $size={8} />
            <Controls>
              {flow([
                map((control) => (
                  <Control
                    key={control.key}
                    control={control}
                    innerRef={bindControl}
                  />
                )),
                interleave(<Spacer $direction="vertical" $size={6} />),
                Children.toArray
              ])(controls)}
            </Controls>
          </>
        )}
        <Spacer $direction="vertical" $size={8} />
      </Base>
    );
  }
}

export default StylizedNode;
