import { StyleSheet, View } from "react-native";
import { Dialog, Button, Text, Tooltip } from "react-native-paper";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

import { MediaExcerpt, Proposition } from "../store/entitiesSlice";
import { ActivateMediaExcerptMessage } from "../content";

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
        {data.appearances?.map((appearance) => {
          const url =
            appearance.mediaExcerpt.canonicalUrl ?? appearance.mediaExcerpt.url;
          const hostname = new URL(url).hostname;
          return (
            <View key={appearance.id}>
              <Text>“{appearance.mediaExcerpt.quotation}”</Text>
              <Text style={styles.sourceName}>
                {appearance.mediaExcerpt.sourceName}
              </Text>
              <Button
                onPress={() => activateMediaExcerpt(appearance.mediaExcerpt)}
              >
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

export async function activateMediaExcerpt(mediaExcerpt: MediaExcerpt) {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const activeTab = tabs[0];
  const url = mediaExcerpt.canonicalUrl ?? mediaExcerpt.url;
  const tabId = await getOrOpenTab(activeTab, url);

  const message: ActivateMediaExcerptMessage = {
    action: "activateMediaExcerpt",
    mediaExcerpt,
  };
  try {
    await chrome.tabs.sendMessage(tabId, message);
  } catch (error) {
    console.error(`Failed to send message to tab`, error);
  }
}

async function getOrOpenTab(
  activeTab: chrome.tabs.Tab,
  url: string
): Promise<number> {
  if (activeTab.url && activeTab.id) {
    return activeTab.id;
  }
  const tabIdPromise = waitForTab(url);
  window.open(url);
  return tabIdPromise;
}

function waitForTab(url: string): Promise<number> {
  return new Promise((resolve) => {
    const tabCreatedListener = (tab: chrome.tabs.Tab) => {
      if (tab.pendingUrl === url) {
        chrome.tabs.onUpdated.addListener(function onUpdatedListener(
          tabId,
          info
        ) {
          if (info.status === "complete" && tabId === tab.id) {
            chrome.tabs.onUpdated.removeListener(onUpdatedListener);
            chrome.tabs.onCreated.removeListener(tabCreatedListener);
            resolve(tabId);
          }
        });
      }
    };

    chrome.tabs.onCreated.addListener(tabCreatedListener);
  });
}