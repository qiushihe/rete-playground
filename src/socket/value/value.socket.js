import Rete from "rete";

import { VALUE } from "../../enum/socket-type.enum";

export const socket = new Rete.Socket("Value Socket", { type: VALUE });
