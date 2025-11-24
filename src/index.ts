import Version from "@fi4f/v";

export const VERSION = Version.new({
  moniker: "yggy",
  major  : 0,
  minor  : 1,
  patch  : 0,
})

export type Listener<T> = (event: T, context: Context<T>) => void;
export type Context <T> = {
  tree: Tree
  node: Node
  path: string
  type: string
  self: Listener<T>
}

const __LISTEN__   = "__listen__"   as const;
const __DEAFEN__   = "__deafen__"   as const;
const __DISPATCH__ = "__dispatch__" as const;

type Listen   = {action: typeof __LISTEN__  , path: string, type  : string, listener  : Listener<any>}
type Deafen   = {action: typeof __DEAFEN__  , path: string, type ?: string, listener ?: Listener<any>}
type Dispatch = {action: typeof __DISPATCH__, path: string, type  : string, event: any}
type Action   = Listen | Deafen | Dispatch

type Node = {
  children : Map<string, Node>
  listeners: Map<string, Set<Listener<any>>>
}

const Node = {
  new() {
    return {
      children : new Map(),
      listeners: new Map()
    } satisfies Node;
  }
}

function requireListeners(root: Node            , type: string) {
  let listeners = root.listeners.get(type);
  if (!listeners) root.listeners.set(
    type, listeners = new Set()
  )
  return listeners;
}

function requestListeners(root: Node | undefined, type: string) {
  let listeners = root?.listeners.get(type);
  // if (!listeners) root.listeners.set(
  //   type, listeners = new Set()
  // )
  return listeners;
}

function requireNode(root: Node            , path: string) {
  for (const part of path.split("/")) {
    let node = root.children.get(part);
    if (!node) root.children.set(
      part, node = Node.new()
    )
    root = node;
  }
  return root;
}

function requestNode(root: Node | undefined, path: string) {
  for (const part of path.split("/")) {
    let node = root?.children.get(part);
    if (!node) return;
    root = node;
  }
  return root;
}

export type Tree = {
  root   : Node
  pending: Array<Action>
}

export const Tree = {
  new() {
    return {
      root   : Node.new(),
      pending: new Array()
    } satisfies Tree;
  },

  listen<T>(tree: Tree, type  : string, listener  : Listener<T>, o ?: { path ?: string, defer ?: boolean }) {
    const a: Listen = { action: __LISTEN__, path: o?.path ?? "", type, listener };
    if(o?.defer ?? true) queue(tree, a);
    else                 flush(tree, a);
  },

  deafen<T>(tree: Tree, type ?: string, listener ?: Listener<T>, o ?: { path ?: string, defer ?: boolean }) {
    const a: Deafen = { action: __DEAFEN__, path: o?.path ?? "", type, listener };
    if(o?.defer ?? true) queue(tree, a);
    else                 flush(tree, a);
  },

  dispatch<T>(tree: Tree, type: string, event: T, o ?: { path ?: string, defer ?: boolean }) {
    const a: Dispatch = { action: __DISPATCH__, path: o?.path ?? "", type, event };
    if(o?.defer ?? true) queue(tree, a);
    else                 flush(tree, a);
  },

  poll(tree: Tree) {
    tree.pending.splice(0).forEach(
      a => flush(tree, a)
    )
  }
}

function queue(tree: Tree, a: Action) {
  tree.pending.push(a);
}

function flush(tree: Tree, a: Action) {
  switch(a.action) {
    case __LISTEN__  : return onListen  (tree, a);
    case __DEAFEN__  : return onDeafen  (tree, a);
    case __DISPATCH__: return onDispatch(tree, a);
  }
}

function onListen  (tree: Tree, a: Listen  ) {
  const node = requireNode(tree.root, a.path);
  const list = requireListeners(node, a.type);
  list.add(a.listener);
}

function onDeafen  (tree: Tree, a: Deafen  ) {
         if (a.type !== undefined && a.listener !== undefined) {
    const node = requestNode(tree.root, a.path);
    const list = requestListeners(node, a.type);
    list?.delete(a.listener);
  } else if (a.type !== undefined && a.listener === undefined) {
    const node = requestNode(tree.root, a.path);
    const list = requestListeners(node, a.type);
    list?.clear();
  } else if (a.type === undefined && a.listener !== undefined) {
    const node = requestNode(tree.root, a.path);
    node?.listeners.forEach(list => {
      list.delete(a.listener!)
    })
  } else if (a.type === undefined && a.listener === undefined) {
    const node = requestNode(tree.root, a.path);
    node?.listeners.clear();
    node?.children .clear();
  }
}

function onDispatch(tree: Tree, a: Dispatch) {
  const node = requestNode(tree.root, a.path);
  if (node) reDispatch(
    node,
    tree, 
    a.path, 
    a.type, 
    a.event
  );
}

function reDispatch(node: Node, tree: Tree, path: string, type: string, event: any) {
  requestListeners(node, type)?.forEach(self => {
    self(event, { tree, node, path, type, self })
  })

  node.children.forEach((node, name) => {
    reDispatch(node, tree, path.split("/").concat(name).join("/"), type, event);
  })
}

export const Yggy = {
  Version,
  VERSION,
  Tree
}

export default Yggy;

