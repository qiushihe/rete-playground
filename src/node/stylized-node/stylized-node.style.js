import styled, { css } from "styled-components";
import flow from "lodash/fp/flow";
import get from "lodash/fp/get";
import cond from "lodash/fp/cond";
import eq from "lodash/fp/eq";
import stubTrue from "lodash/fp/stubTrue";
import constant from "lodash/fp/constant";

export const Base = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 180px;
  height: auto;
  border: 1px solid #000000;
  border-radius: 6px;
  background-color: #252525;
  box-shadow: ${flow([
    get("$selected"),
    cond([
      [Boolean, constant("0 0 6px 0 #0000ff")],
      [stubTrue, constant("none")]
    ])
  ])};
  overflow: hidden;
  cursor: pointer;
  user-select: none;
`;

const spacerHorizontal = css`
  flex-direction: row;
  width: ${get("$size")}px;
  height: 1px;
`;

const spacerVertical = css`
  flex-direction: column;
  width: 1px;
  height: ${get("$size")}px;
`;

export const Spacer = styled.div`
  display: inline-flex;
  ${flow([
    get("$direction"),
    cond([
      [eq("horizontal"), constant(spacerHorizontal)],
      [eq("vertical"), constant(spacerVertical)]
    ])
  ])};
`;

export const Separator = styled.hr`
  display: flex;
  margin: 0;
  padding: 0;
  border: none;
  width: 100%;
  height: 1px;
  background: #696969;
`;

export const Header = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 4px 8px;
  background: linear-gradient(
    315deg,
    rgba(5, 0, 82, 1) 0%,
    rgba(9, 9, 121, 1) 36%,
    rgba(0, 153, 184, 1) 100%
  );
`;

export const Icon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  margin-right: 4px;

  &:after {
    content: "❉";
    font-size: 12px;
    color: white;
  }
`;

export const Title = styled.div`
  font-size: 14px;
  color: white;
`;

export const Connections = styled.div`
  display: flex;
  flex-direction: row;

  &[data-category="primary-flow-control-sockets"] {
    .socket.action-socket {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background-color: transparent;
      border: 1px solid #96b38a;
      border-radius: 4px;

      &:after {
        content: "❯❯";
        color: #96b38a;
        font-size: 12px;
      }

      &:hover {
        border-color: #ffffff;

        &:after {
          color: #ffffff;
        }
      }
    }
  }

  &[data-category="regular-sockets"] {
    .socket.action-socket {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background-color: transparent;
      border: 1px solid #96b38a;

      &:after {
        content: "➔";
        color: #96b38a;
        font-size: 12px;
      }

      &:hover {
        border-color: #ffffff;

        &:after {
          color: #ffffff;
        }
      }
    }
  }
`;

export const ConnectionGroup = styled.div`
  display: flex;
  flex-direction: column;
  width: 50%;
  align-items: ${flow([
    get("$direction"),
    cond([
      [eq("input"), constant("flex-start")],
      [eq("output"), constant("flex-end")]
    ])
  ])};
  margin-left: ${flow([
    get("$direction"),
    cond([
      [eq("input"), constant("8px")],
      [stubTrue, constant(0)]
    ])
  ])};
  margin-right: ${flow([
    get("$direction"),
    cond([
      [eq("output"), constant("8px")],
      [stubTrue, constant(0)]
    ])
  ])};
`;

export const Connection = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;

  > .socket {
    &.input {
      margin-left: 0;
    }

    &.output {
      margin-right: 0;
    }

    width: 16px;
    height: 16px;
  }
`;

export const ConnectionLabel = styled.div`
  font-size: 12px;
  color: white;
`;

export const Controls = styled.div`
  display: flex;
  flex-direction: column;
  margin: 0 8px;
`;
