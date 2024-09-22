import { Button, Dialog, Portal } from "react-native-paper";
import { useSelector } from "react-redux";

import * as selectors from "../store/selectors";
import { Map } from "../store/entitiesSlice";

const sophistreeMapFileVersion = 1;

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

  function downloadMap(map: Map) {
    downloadJSON(`${map.name}.json`, { map, sophistreeMapFileVersion });
  }

  function downloadAllMaps() {
    downloadJSON("maps.json", { maps, sophistreeMapFileVersion });
  }

  const buttons = maps.map((m) => (
    <Button key={m.id} onPress={() => downloadMap(m)}>
      Download {m.name}
    </Button>
  ));

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={hideModal}>
        <Dialog.Title>Open a map</Dialog.Title>
        <Dialog.Content>
          {buttons}
          <Button onPress={downloadAllMaps}>Download all maps</Button>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={hideModal}>Done</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

function downloadJSON(filename: string, data: any) {
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
