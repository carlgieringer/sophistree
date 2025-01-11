import { ArgumentMap } from "@sophistree/common";

import { persistedStateVersion } from "../store/migrations";

export const sophistreeMapFileVersion = persistedStateVersion;

export function downloadMap(map: ArgumentMap) {
  downloadJSON(`${map.name}.sophistree.json`, {
    maps: [map],
    sophistreeMapFileVersion,
  });
}

export function downloadMaps(maps: ArgumentMap[]) {
  const timestamp = new Date().toISOString();
  const count = maps.length;
  downloadJSON(`maps (${count}) ${timestamp}.sophistree.json`, {
    maps,
    sophistreeMapFileVersion,
  });
}

export function downloadJSON(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
