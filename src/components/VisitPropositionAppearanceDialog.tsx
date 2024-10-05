import React from "react";
import { StyleSheet, View } from "react-native";
import { Dialog, Button, Text, Tooltip } from "react-native-paper";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

import {
  MediaExcerpt,
  preferredUrl,
  Proposition,
} from "../store/entitiesSlice";
import { getTabUrl, FocusMediaExcerptMessage } from "../extension/messages";
import { AppDispatch, useAppDispatch } from "../store";

export interface AppearanceInfo {
  id: string;
  mediaExcerpt: MediaExcerpt;
}

export type PropositionNodeData = Proposition & {
  appearances: AppearanceInfo[] | undefined;
  isAnyAppearanceSelected: boolean;
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
  const dispatch = useAppDispatch();
  return (
    <Dialog visible={visible} onDismiss={onDismiss}>
      <Dialog.Title>Appearances for “{data.text}”</Dialog.Title>
      <Dialog.Content>
        {data.appearances?.map((appearance) => {
          const url = preferredUrl(appearance.mediaExcerpt.urlInfo);
          const hostname = new URL(url).hostname;
          return (
            <View key={appearance.id}>
              <Text>“{appearance.mediaExcerpt.quotation}”</Text>
              <Text style={styles.sourceName}>
                {appearance.mediaExcerpt.sourceInfo.name}
              </Text>
              <Button
                onPress={() =>
                  void focusMediaExcerpt(dispatch, appearance.mediaExcerpt)
                }
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

export async function focusMediaExcerpt(
  dispatch: AppDispatch,
  mediaExcerpt: MediaExcerpt,
) {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const activeTab = tabs[0];
  const mediaExcerptUrl = preferredUrl(mediaExcerpt.urlInfo);
  const mediaExcerptId = mediaExcerpt.id;
  const tabId = await getOrOpenTab(activeTab, mediaExcerptUrl);

  const message: FocusMediaExcerptMessage = {
    action: "focusMediaExcerpt",
    mediaExcerptId,
  };
  try {
    await chrome.tabs.sendMessage(tabId, message);
  } catch (error) {
    console.error(
      `Failed to send focusMediaExcerpt message to tab`,
      message,
      error,
    );
  }
}

async function getOrOpenTab(
  activeTab: chrome.tabs.Tab,
  url: string,
): Promise<number> {
  if (!activeTab.id) {
    throw new Error("Active tab ID was missing. This should never happen.");
  }
  // activeTab.url is often missing, so we request it from the tab.
  let tabUrl = undefined;
  try {
    tabUrl = await getTabUrl(activeTab.id);
  } catch (error) {
    console.error(`Failed to getTabUrl`, error);
  }
  if (tabUrl === url) {
    return activeTab.id;
  }
  const tabIdPromise = waitForTabId(activeTab.id);
  window.open(url);
  return tabIdPromise;
}

function waitForTabId(openerTabId: number): Promise<number> {
  return new Promise((resolve) => {
    const tabCreatedListener = (tab: chrome.tabs.Tab) => {
      if (tab.openerTabId === openerTabId) {
        chrome.tabs.onUpdated.addListener(
          function onUpdatedListener(tabId, info) {
            if (info.status === "complete" && tabId === tab.id) {
              chrome.tabs.onUpdated.removeListener(onUpdatedListener);
              chrome.tabs.onCreated.removeListener(tabCreatedListener);
              resolve(tabId);
            }
          },
        );
      }
    };

    chrome.tabs.onCreated.addListener(tabCreatedListener);
  });
}
