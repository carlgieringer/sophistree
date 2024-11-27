import { MutableRefObject } from "react";
import { useEffect } from "react";

import { getEntityId } from "./entityIds";

export function useSelectedNodes(
  cyRef: MutableRefObject<cytoscape.Core | undefined>,
  selectedEntityIds: string[],
) {
  useEffect(() => {
    cyRef.current
      ?.elements()
      .filter((n) => !selectedEntityIds.includes(getEntityId(n)))
      .unselect();
    if (selectedEntityIds.length) {
      cyRef.current
        ?.elements()
        .filter((n) => selectedEntityIds.includes(getEntityId(n)))
        .select();
    }
  }, [cyRef, selectedEntityIds]);
}
