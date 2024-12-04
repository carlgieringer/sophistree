import { useCallback, useState, useEffect } from "react";
import { Menu } from "react-native-paper";
import type {
  EventObject,
  Core,
  NodeSingular,
  EdgeSingular,
  EventObjectCore,
  EventObjectNode,
  EventObjectEdge,
  ElementDataDefinition,
} from "cytoscape";
import { RefObject } from "react";
import { OnToggleCollapse } from "./collapsing";

type ContextMenuEvent = EventObjectNode | EventObjectEdge | EventObjectCore;

interface UseContextMenusProps {
  cyRef: RefObject<Core | undefined>;
  onDeleteEntity?: OnDeleteEntity;
  onAddNewProposition?: () => void;
  onToggleCollapse: OnToggleCollapse;
  zoomIn: (event: EventObject) => void;
  zoomOut: (event: EventObject) => void;
  setDebugElementData: (data: ElementDataDefinition | undefined) => void;
  layoutGraph: (fit?: boolean) => void;
}

export interface OnDeleteEntity {
  (entityId: string): void;
}

export function useContextMenus({
  cyRef,
  onDeleteEntity,
  onAddNewProposition,
  onToggleCollapse,
  zoomIn,
  zoomOut,
  setDebugElementData,
  layoutGraph,
}: UseContextMenusProps) {
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuTarget, setMenuTarget] = useState<
    NodeSingular | EdgeSingular | undefined
  >(undefined);

  const isCore = useCallback(
    (target: unknown): target is Core => {
      return target === cyRef.current;
    },
    [cyRef],
  );

  const handleContextMenu = useCallback(
    (e: ContextMenuEvent) => {
      e.preventDefault();
      const position = e.renderedPosition || { x: 0, y: 0 };
      setMenuPosition(position);

      const target = e.target;
      if (isCore(target)) {
        setMenuTarget(undefined);
      } else {
        setMenuTarget(target);
      }

      setMenuVisible(true);
    },
    [isCore],
  );

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) {
      return;
    }

    cy.on("cxttap", handleContextMenu);
    cy.on("taphold", handleContextMenu);
    return () => {
      cy.off("cxttap", handleContextMenu);
      cy.off("taphold", handleContextMenu);
    };
  }, [cyRef, handleContextMenu]);

  // Check if the target node has any incoming edges (children)
  const isCollapsible = useCallback((target: NodeSingular | EdgeSingular) => {
    if (target.data("isCollapsed")) {
      return true;
    }
    if (target.isNode()) {
      if (target.data("entity.type") === "Justification") {
        // Don't allow collapsing counter justification intermediate nodes.
        return false;
      }
      const incomers = target.incomers();
      return incomers.length > 0;
    }
    return false;
  }, []);

  const MenuComponent = (
    <Menu
      visible={menuVisible}
      onDismiss={() => setMenuVisible(false)}
      anchor={menuPosition}
    >
      {menuTarget && onDeleteEntity && (
        <Menu.Item
          onPress={() => {
            const entityId = menuTarget.data("entity.id") as unknown;
            if (typeof entityId === "string") {
              onDeleteEntity(entityId);
            }
            setMenuVisible(false);
          }}
          title="Delete"
        />
      )}
      {menuTarget?.isNode() && isCollapsible(menuTarget) && (
        <Menu.Item
          onPress={() => {
            const entityId = menuTarget.data("entity.id") as string;
            onToggleCollapse(entityId);
            setMenuVisible(false);
          }}
          title={menuTarget.data("isCollapsed") ? "Expand" : "Collapse"}
        />
      )}
      {onAddNewProposition && (
        <Menu.Item
          onPress={() => {
            onAddNewProposition();
            setMenuVisible(false);
          }}
          title="Add proposition"
        />
      )}
      <Menu.Item
        onPress={() => {
          const cy = cyRef.current;
          if (!cy) return;

          zoomOut({
            renderedPosition: menuPosition,
            position: menuPosition,
            cy,
            target: cy,
            originalEvent: new MouseEvent("contextmenu"),
            type: "cxttap",
            namespace: "",
            timeStamp: Date.now(),
          } as EventObject);
          setMenuVisible(false);
        }}
        title="Zoom out"
      />
      <Menu.Item
        onPress={() => {
          const cy = cyRef.current;
          if (!cy) return;

          zoomIn({
            renderedPosition: menuPosition,
            position: menuPosition,
            cy,
            target: cy,
            originalEvent: new MouseEvent("contextmenu"),
            type: "cxttap",
            namespace: "",
            timeStamp: Date.now(),
          } as EventObject);
          setMenuVisible(false);
        }}
        title="Zoom in"
      />
      <Menu.Item
        onPress={() => {
          layoutGraph(true);
          setMenuVisible(false);
        }}
        title="Fit to contents"
      />
      {menuTarget && (
        <Menu.Item
          onPress={() => {
            setDebugElementData(menuTarget.data() as ElementDataDefinition);
            setMenuVisible(false);
          }}
          title="Show element data"
        />
      )}
    </Menu>
  );

  return MenuComponent;
}
