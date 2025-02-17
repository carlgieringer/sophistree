import deepEqual from "deep-equal";
import { insertAt } from "@automerge/automerge/next";

import { ArgumentMap, calculateConclusions } from "@sophistree/common";

export function updateConclusions(map: ArgumentMap) {
  const newConclusions = calculateConclusions(map.entities);

  let oldIndex = 0;
  let newIndex = 0;
  let mergedIndex = 0;
  const oldConclusions = Array.from(map.conclusions);
  while (oldIndex < oldConclusions.length && newIndex < newConclusions.length) {
    const oldConclusion = oldConclusions[oldIndex];
    const newConclusion = newConclusions[newIndex];
    if (deepEqual(oldConclusion, newConclusion)) {
      // The conclusions are equal and there's nothing to change.
      oldIndex++;
      newIndex++;
      mergedIndex++;
    } else {
      const key1 = JSON.stringify({
        sourceNames: oldConclusion.appearanceInfo.sourceNames,
        domains: oldConclusion.appearanceInfo.domains,
      });
      const key2 = JSON.stringify({
        sourceNames: newConclusion.appearanceInfo.sourceNames,
        domains: newConclusion.appearanceInfo.domains,
      });
      const comparison = key1.localeCompare(key2);
      if (comparison > 0) {
        // The new conclusion comes before the old one
        insertAt(map.conclusions, mergedIndex, newConclusion);
        mergedIndex++;
        newIndex++;
      } else if (comparison < 0) {
        // The new conclusion comes after the old one
        oldIndex++;
      } else {
        // The new conclusion replaces the old one
        map.conclusions.splice(oldIndex, 1, newConclusion);
        oldIndex++;
        newIndex++;
        mergedIndex++;
      }
    }
  }
  const remainingNewConclusions = newConclusions.slice(newIndex);
  if (mergedIndex < map.conclusions.length) {
    map.conclusions.splice(
      mergedIndex,
      oldConclusions.length - oldIndex,
      ...remainingNewConclusions,
    );
  } else {
    // Automerge list proxies don't support using splice to insert at the end of an array.
    insertAt(
      map.conclusions,
      map.conclusions.length,
      ...remainingNewConclusions,
    );
  }
}
