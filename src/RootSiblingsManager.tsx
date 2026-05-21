import React, {
  ComponentType,
  PropsWithChildren,
  ReactNode,
  useEffect,
  useState
} from 'react';

import ChildrenWrapper from './ChildrenWrapper';
import wrapRootComponent, {
  DEFAULT_ID,
  RootSiblingManager
} from './wrapRootComponent';

let siblingWrapper: (sibling: ReactNode) => ReactNode = sibling => sibling;

function renderSibling(sibling: ReactNode): ReactNode {
  return siblingWrapper(sibling);
}

export function setSiblingWrapper(wrapper: (sibling: ReactNode) => ReactNode) {
  siblingWrapper = wrapper;
}

const { manager: defaultManager } = wrapRootComponent(
  ChildrenWrapper,
  renderSibling
);
let uuid: number = 0;
const managerStack: RootSiblingManager[] = [defaultManager];
const inactiveManagers: Set<RootSiblingManager> = new Set();

function getActiveManager(id: string | number | symbol): RootSiblingManager {
  for (let i = managerStack.length - 1; i >= 0; i--) {
    const manager = managerStack[i];
    if (!inactiveManagers.has(manager) && manager.id === id) {
      return manager;
    }
  }

  return defaultManager;
}

export default class RootSiblingsManager {
  private id: string;
  private manager: RootSiblingManager;

  constructor(
    element: ReactNode,
    callback?: () => void,
    id: string | number | symbol = DEFAULT_ID
  ) {
    this.id = `root-sibling-${uuid + 1}`;
    this.manager = getActiveManager(id);
    this.manager.update(this.id, element, callback);
    uuid++;
  }

  public update(element: ReactNode, callback?: () => void) {
    this.manager.update(this.id, element, callback);
  }

  public destroy(callback?: () => void) {
    this.manager.destroy(this.id, callback);
  }
}

export function RootSiblingParent(props: {
  children: ReactNode;
  inactive?: boolean;
  id?: string | number | symbol;
}) {
  const { inactive, id } = props;
  const [sibling] = useState<{
    Root: ComponentType<PropsWithChildren>;
    manager: RootSiblingManager;
  }>(() => {
    const { Root: parentRoot, manager: parentManager } = wrapRootComponent(
      ChildrenWrapper,
      renderSibling,
      id
    );

    managerStack.push(parentManager);
    if (inactive) {
      inactiveManagers.add(parentManager);
    }

    return {
      Root: parentRoot,
      manager: parentManager
    };
  });

  useEffect(() => {
    return () => {
      if (sibling) {
        const index = managerStack.indexOf(sibling.manager);
        if (index > 0) {
          managerStack.splice(index, 1);
        }
      }
    };
  }, [sibling]);

  if (inactive && sibling && !inactiveManagers.has(sibling.manager)) {
    inactiveManagers.add(sibling.manager);
  } else if (!inactive && sibling && inactiveManagers.has(sibling.manager)) {
    inactiveManagers.delete(sibling.manager);
  }

  const Parent = sibling.Root;
  return <Parent>{props.children}</Parent>;
}

export function RootSiblingPortal(props: { children: ReactNode }) {
  const [sibling] = useState<RootSiblingsManager>(
    () => new RootSiblingsManager(null)
  );

  sibling.update(props.children);

  useEffect(() => {
    if (sibling) {
      return () => sibling.destroy();
    }
  }, [sibling]);

  return null;
}
