import Rete from "rete";

import { ACTION } from "../../enum/socket-type.enum";

import { DEFAULT, PRIMARY_FLOW_CONTROL } from "../../enum/socket-category.enum";

export const socket = new Rete.Socket("Action Socket", {
  type: ACTION,
  category: DEFAULT
});

export const primaryFlowControlSocket = new Rete.Socket("Action Socket", {
  type: ACTION,
  category: PRIMARY_FLOW_CONTROL
});

socket.combineWith(primaryFlowControlSocket);
