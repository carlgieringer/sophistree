import React from "react";
import { StyleSheet, View } from "react-native";
import { Dialog, Button, Text, Tooltip, Divider } from "react-native-paper";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

import {
  deleteEntity,
  MediaExcerpt,
  preferredUrl,
} from "../store/entitiesSlice";
import { getTabUrl, FocusMediaExcerptMessage } from "../extension/messages";
import { PropositionNodeData } from "./graphTypes";
import { catchErrors } from "../extension/callbacks";
import * as appLogger from "../logging/appLogging";
import { tabConnectDelayMillis } from "../App";
import { useAppDispatch } from "../store";

export default function PropositionAppearanceDialog({
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
      <Dialog.Title>Appearances for “{data.entity.text}”</Dialog.Title>
      <Dialog.Content>
        {data.appearances?.map((appearance, i) => {
          const url = preferredUrl(appearance.mediaExcerpt.urlInfo);
          const hostname = new URL(url).hostname;
          return (
            <>
              {i > 0 ? <Divider style={styles.divider} /> : null}
              <View>
                <Text>“{appearance.mediaExcerpt.quotation}”</Text>
                <Text style={styles.sourceName}>
                  {appearance.mediaExcerpt.sourceInfo.name}{" "}
                </Text>
                <Tooltip title={url}>
                  <Text style={styles.hostname}>{hostname}</Text>
                </Tooltip>
                <View key={appearance.id} style={styles.row}>
                  <Button
                    style={styles.goButtonCell}
                    onPress={() =>
                      void focusMediaExcerpt(appearance.mediaExcerpt)
                    }
                  >
                    Go
                  </Button>
                  <Button
                    style={styles.deleteButtonCell}
                    accessibilityLabel="delete appearance"
                    onPress={() => dispatch(deleteEntity(appearance.id))}
                  >
                    <Icon name="delete" size={18} />
                  </Button>
                </View>
              </View>
            </>
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
  hostname: {
    fontWeight: "bold",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  goButtonCell: {
    flex: 1,
  },
  deleteButtonCell: {
    flexShrink: 0,
    marginLeft: 10,
  },
  divider: {
    marginBottom: 20,
  },
});

export async function focusMediaExcerpt(mediaExcerpt: MediaExcerpt) {
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
    appLogger.error(`Failed to send focusMediaExcerpt message to tab`, error);
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
    appLogger.error(`Failed to getTabUrl`, error);
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
    chrome.tabs.onCreated.addListener(function tabCreatedListener(
      tab: chrome.tabs.Tab,
    ) {
      catchErrors(() => {
        if (tab.openerTabId === openerTabId) {
          chrome.tabs.onUpdated.addListener(
            function onUpdatedListener(tabId, info) {
              catchErrors(() => {
                if (info.status === "complete" && tabId === tab.id) {
                  chrome.tabs.onUpdated.removeListener(onUpdatedListener);
                  chrome.tabs.onCreated.removeListener(tabCreatedListener);
                  // Give the tab time to load the highlights.
                  setTimeout(() => resolve(tabId), 1.1 * tabConnectDelayMillis);
                }
              });
            },
          );
        }
      });
    });
  });
}
