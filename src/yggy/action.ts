import Listener from "./listener";
import Tree from "./tree";

export type Action = Action.Listen | Action.Deafen | Action.Dispatch;

export namespace Action {
  export const LISTEN   = "__listen__";
  export const DEAFEN   = "__deafen__";
  export const DISPATCH = "__dispatch__";

  export interface Listen   { action: typeof Action.LISTEN  , tree: Tree, type  : string, listener  : Listener<any>, path: string}
  export interface Deafen   { action: typeof Action.DEAFEN  , tree: Tree, type ?: string, listener ?: Listener<any>, path: string}
  export interface Dispatch { action: typeof Action.DISPATCH, tree: Tree, type  : string, event: any, path: string}
}

export default Action;


