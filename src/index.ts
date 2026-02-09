import { Version } from "@fi4f/v";
import { Id      } from "@fi4f/id";

export const VERSION = Version.new({
  moniker: "yggy",
  major  : 0,
  minor  : 2,
  patch  : 0,
})

const __LISTEN__   = "__listen__"   as const;
const __DEAFEN__   = "__deafen__"   as const;
const __DISPATCH__ = "__dispatch__" as const;


export namespace Yggy {
  export type Event = 
    | null
    | number
    | string
    | boolean
    | Array<Event>
    | {[key: string]: Event}

  export type Handler<T extends Event = any> = (what: T, with_: Context<T>) => void;
  export type Context<T extends Event = any> = {
    tree: Tree
    path: string
    when: string
    self: Id<Handler<T>>
  }

  export type Listen   <T extends Event = any>= {action: typeof __LISTEN__  , path: string, when  : string, then  : Id<Yggy.Handler<T>>}
  export type Deafen   <T extends Event = any>= {action: typeof __DEAFEN__  , path: string, when ?: string, then ?: Id<Yggy.Handler<T>>}
  export type Dispatch <T extends Event = any>= {action: typeof __DISPATCH__, path: string, when  : string, what  : T}
  export type Action   <T extends Event = any>= Listen<T> | Deafen<T> | Dispatch<T>

  export type Node = {
    children: {[id: string]: Node}
    handlers: {[id: string]: Array<Id<Yggy.Handler<Event>>>}
  }

  export type Tree = {
    root   : Node
    pending: Array<Action>
  }
}


const Node = {
  new(): Yggy.Node {
    return {
      children: {},
      handlers: {}
    } satisfies Yggy.Node
  }
}

const Tree = {
  new(): Yggy.Tree {
    return {
      root   : Node.new(),
      pending:         []
    } satisfies Yggy.Tree
  },

  listen<T extends Yggy.Event>(tree: Yggy.Tree, when  : string, then  :    Yggy.Handler<T> , o ?: { path ?: string, defer ?: boolean }) {
    const a: Yggy.Listen<T>   = { action: __LISTEN__  , path: o?.path ?? "", when, then: Id.acquire(then) };
    if (o?.defer ?? true) queue(tree, a);
    else                  flush(tree, a);
    return a.then
  },

  deafen<T extends Yggy.Event>(tree: Yggy.Tree, when ?: string, then ?: Id<Yggy.Handler<T>>, o ?: { path ?: string, defer ?: boolean }) {
    const a: Yggy.Deafen<T>   = { action: __DEAFEN__  , path: o?.path ?? "", when, then };
    if (o?.defer ?? true) queue(tree, a);
    else                  flush(tree, a);
  },

  dispatch<T extends Yggy.Event>(tree: Yggy.Tree, when: string, what: T, o ?: { path ?: string, defer ?: boolean }) {
    const a: Yggy.Dispatch<T> = { action: __DISPATCH__, path: o?.path ?? "", when, what };
    if (o?.defer ?? true) queue(tree, a);
    else                  flush(tree, a);
  },

  poll(tree: Yggy.Tree) {
    tree.pending.splice(0).forEach(
      a => flush(tree, a)
    )
  }
}

function once<T extends Yggy.Event>(then: Yggy.Handler<T>) {
  return ((what: T, {tree, path, when, self}: Yggy.Context<T>) => {
    then?.(what, {tree, path, when, self});
    Tree.deafen(tree, when, self, { path, defer: false });
  }) satisfies Yggy.Handler<T>
}

function queue(tree: Yggy.Tree, a: Yggy.Action) {
  tree.pending.push(a);
}

function flush(tree: Yggy.Tree, a: Yggy.Action) {
  switch(a.action) {
    case __LISTEN__  : return onListen  (tree, a);
    case __DEAFEN__  : return onDeafen  (tree, a);
    case __DISPATCH__: return onDispatch(tree, a);
  }
}

function requestNode(root: Yggy.Node | undefined, path: string) {
  for(const part of path.split("/")) {
    let node = root?.children[part];
    if (!node) return;
    root = node;
  }

  return root;
}

function requireNode(root: Yggy.Node            , path: string) {
  for(const part of path.split("/")) {
    let node = root.children[part];
    if (!node) root.children[part] = (
      node = Node.new()
    );
    root = node;
  }

  return root;
}

function requestHandlers(root: Yggy.Node | undefined, when: string) {
  let handlers = root?.handlers[when];
  return handlers;
}

function requireHandlers(root: Yggy.Node            , when: string) {
  let handlers = root.handlers[when];
  if (!handlers) root.handlers[when] = (
    handlers = new Array()
  );
  return handlers;
}

function acquireHandler(list: Array<Id<Yggy.Handler>>, then: Id<Yggy.Handler>) {
  if (list.includes(then))
    return console.warn(`[Yggy.acquireHandler] Handler with id '${then}' already exists`);

  list.push(then);
}

function releaseHandler(list: Array<Id<Yggy.Handler>>, then: Id<Yggy.Handler>) {
  if (!list.includes(then))
    return console.warn(`[Yggy.releaseHandler] Handler with id '${then}' does not exist`);

  Id.release(
    list.splice(
      list.indexOf(then), 1)[0]);
}

function releaseHandlers(list: Array<Id<Yggy.Handler>>) {
  list.splice(0).forEach(then => Id.release(then));
}

function releaseNode(root: Yggy.Node) {
  Object.entries(root.handlers).forEach(
    ([when, list]) => releaseHandlers(list)
  );
  Object.entries(root.children).forEach(
    ([part, node]) => releaseNode    (node)
  );
}

function onListen  (tree: Yggy.Tree, a: Yggy.Listen  ) {
  acquireHandler(
    requireHandlers(
      requireNode(tree.root, a.path), a.when), a.then);
}

function onDeafen  (tree: Yggy.Tree, a: Yggy.Deafen  ) {
         if (a.when !== undefined && a.then !== undefined) {
    const node = requestNode(tree.root, a.path);
    if (!node) 
      return console.warn(`[Yggy.onDeafen] Node with path '${a.path}' does not exist`);
    
    const list = requestHandlers (node, a.when);
    if (!list) 
      return console.warn(`[Yggy.onDeafen] Node with path '${a.path}' does not have handlers for signal '${a.when}'`);
    
    releaseHandler(list, a.then);
  } else if (a.when !== undefined && a.then === undefined) {
    const node = requestNode(tree.root, a.path);
    if (!node) 
      return console.warn(`[Yggy.onDeafen] Node with path '${a.path}' does not exist`);
    
    const list = requestHandlers (node, a.when);
    if (!list) 
      return console.warn(`[Yggy.onDeafen] Node with path '${a.path}' does not have handlers for signal '${a.when}'`);

    releaseHandlers(list);
  } else if (a.when === undefined && a.then !== undefined) {
    const node = requestNode(tree.root, a.path);
    if (!node) 
      return console.warn(`[Yggy.onDeafen] Node with path '${a.path}' does not exist`);

    Object.entries(node.handlers).forEach(
      ([when, list]) => releaseHandler(list, a.then!)
    )
  } else if (a.when === undefined && a.then === undefined) {
    const node = requestNode(tree.root, a.path);
    if (!node) 
      return console.warn(`[Yggy.onDeafen] Node with path '${a.path}' does not exist`);

    releaseNode (node);
    node.children = {};
    node.handlers = {};
  }
}

function onDispatch(tree: Yggy.Tree, a: Yggy.Dispatch) {
  const node = requestNode(tree.root, a.path);
  if (!node) return
  reDispatch(node, tree, a.path, a.when, a.what);
}

function reDispatch(node: Yggy.Node, tree: Yggy.Tree, path: string, when: string, what: any) {
  requestHandlers(node, when)?.forEach(self => {
    Id.request(self)(what, {tree, path, when, self})
  })

  Object.entries(node.children).forEach(([part, node]) => {
    reDispatch(node, tree, path.split("/").concat(part).join("/"), when, what);
  })
}

export const Yggy = {
  VERSION,
  Tree,
  Node,
  once
}

export { Id      } from "@fi4f/id";
export { Version } from "@fi4f/v";