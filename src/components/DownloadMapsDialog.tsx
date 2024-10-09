import React from "react";
import { Button, Dialog } from "react-native-paper";
import { useSelector } from "react-redux";

import * as selectors from "../store/selectors";
import { ArgumentMap } from "../store/entitiesSlice";
import { persistedStateVersion } from "../store/migrations";

export const sophistreeMapFileVersion = persistedStateVersion;

export default function DownloadMapsDialog({
  onDismiss,
  visible,
}: {
  onDismiss?: () => void;
  visible: boolean;
}) {
  const maps = useSelector(selectors.allMaps);

  function hideModal() {
    if (onDismiss) {
      onDismiss();
    }
  }

  function downloadMap(map: ArgumentMap) {
    downloadJSON(`${map.name}.sophistree.json`, {
      maps: [map],
      sophistreeMapFileVersion,
    });
  }

  function downloadAllMaps() {
    const timestamp = new Date().toString();
    const count = maps.length;
    downloadJSON(`maps (${count}) ${timestamp}.sophistree.json`, {
      maps,
      sophistreeMapFileVersion,
    });
  }

  const buttons = maps.map((m) => (
    <Button key={m.id} onPress={() => downloadMap(m)}>
      Download {m.name}
    </Button>
  ));

  return (
    <Dialog visible={visible} onDismiss={hideModal}>
      <Dialog.Title>Download maps</Dialog.Title>
      <Dialog.Content>
        {buttons}
        <Button onPress={downloadAllMaps}>Download all maps</Button>
      </Dialog.Content>
      <Dialog.Actions>
        <Button onPress={hideModal}>Done</Button>
      </Dialog.Actions>
    </Dialog>
  );
}

function downloadJSON(filename: string, data: unknown) {
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
