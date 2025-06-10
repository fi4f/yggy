import Tree    from "./tree";
import Context from "./context";

export type Listener<T> = (event: T, context: Context<T>) => void;

export namespace Listener {  
  export function upto<T>(listener: Listener<T>, count=1) {
    return (event: T, context: Context<T>) => {
      count -=1;
      if(count >= 0) listener(event, context);
      if(count <= 0) Tree.deafen(...Context.tuple(context));
    }
  }

  export function once<T>(listener: Listener<T>) {
    return Listener.upto(listener, 1)
  }
}

export default Listener;