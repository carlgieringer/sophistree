import React from "react";
import { Button, Dialog } from "react-native-paper";

import { useAllMaps } from "../sync/hooks";
import { downloadMap, downloadMaps } from "../download";

export default function DownloadMapsDialog({
  onDismiss,
  visible,
}: {
  onDismiss?: () => void;
  visible: boolean;
}) {
  const maps = useAllMaps();

  function hideModal() {
    if (onDismiss) {
      onDismiss();
    }
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
        <Button onPress={() => downloadMaps(maps)}>Download all maps</Button>
      </Dialog.Content>
      <Dialog.Actions>
        <Button onPress={hideModal}>Done</Button>
      </Dialog.Actions>
    </Dialog>
  );
}
