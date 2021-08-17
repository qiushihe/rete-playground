import flow from "lodash/fp/flow";
import map from "lodash/fp/map";
import flatten from "lodash/fp/flatten";
import slice from "lodash/fp/slice";

export const interleave = (extra) =>
  flow([map((item) => [item, extra]), flatten, slice(0, -1)]);
