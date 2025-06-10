import Tree     from "./tree";
import Node     from "./node";
import Listener from "./listener";

export interface Context<T> {
  readonly self: Listener<T>
  readonly tree: Tree
  readonly node: Node
  readonly type: string
  readonly path: string
}

export namespace Context {
  export function tuple(context: Context<any>, defer ?: boolean) {
    return [ 
      context.tree,
      context.type,
      context.self,
      { path: context.path, defer } 
    ] as const;
  }
}

export default Context;