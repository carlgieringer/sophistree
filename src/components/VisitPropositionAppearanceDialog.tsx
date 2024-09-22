import { StyleSheet, View } from "react-native";
import { Dialog, Button, Text, Tooltip } from "react-native-paper";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

import { MediaExcerpt, Proposition } from "../store/entitiesSlice";

export interface AppearanceInfo {
  id: string;
  mediaExcerpt: MediaExcerpt;
}

export type PropositionNodeData = Proposition & {
  appearances: AppearanceInfo[] | undefined;
};

export default function VisitPropositionAppearanceDialog({
  data,
  visible,
  onDismiss,
}: {
  data: PropositionNodeData;
  visible: boolean;
  onDismiss: () => void;
}) {
  return (
    <Dialog visible={visible} onDismiss={onDismiss}>
      <Dialog.Title>Appearances for “{data.text}”</Dialog.Title>
      <Dialog.Content>
        {data.appearances?.map((appearance, index) => {
          const url =
            appearance.mediaExcerpt.canonicalUrl ?? appearance.mediaExcerpt.url;
          const hostname = new URL(url).hostname;
          return (
            <View key={appearance.id}>
              <Text>“{appearance.mediaExcerpt.quotation}”</Text>
              <Text style={styles.sourceName}>
                {appearance.mediaExcerpt.sourceName}
              </Text>
              <Button onPress={() => openUrlInActiveTab(url)}>
                Open {hostname}{" "}
                <Tooltip title={url}>
                  <Icon name="link" size={16} />
                </Tooltip>
              </Button>
            </View>
          );
        })}
      </Dialog.Content>
      <Dialog.Actions>
        <Button onPress={onDismiss}>Close</Button>
      </Dialog.Actions>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  sourceName: {
    fontWeight: "bold",
  },
});

export function openUrlInActiveTab(url: string) {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    const activeTab = tabs[0];
    if (!activeTab.id) {
      return;
    }
    // chrome:// tabs e.g. have no URL
    if (!activeTab.url) {
      window.open(url);
      return;
    }
    chrome.tabs
      .sendMessage(activeTab.id, {
        action: "openUrl",
        url,
      })
      .catch((reason) => {
        console.error(`Failed to open URL in active tab`, reason);
      });
  });
}
