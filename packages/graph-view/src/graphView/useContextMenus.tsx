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

type ContextMenuEvent = EventObjectNode | EventObjectEdge | EventObjectCore;

interface UseContextMenusProps {
  cyRef: RefObject<Core | undefined>;
  onDeleteEntity?: OnDeleteEntity;
  onAddNewProposition?: () => void;
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
    return () => {
      cy.off("cxttap", handleContextMenu);
    };
  }, [cyRef, handleContextMenu]);

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
