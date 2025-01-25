import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet, View, ScrollView } from "react-native";
import { Button, ProgressBar, Text } from "react-native-paper";

import {
  isMatchingUrlInfo,
  MediaExcerpt,
  BasisOutcome,
} from "@sophistree/common";

import EntityEditor from "./components/EntityEditor";
import HeaderBar from "./components/HeaderBar";
import {
  addMediaExcerpt,
  AddMediaExcerptData,
  selectEntities,
  useActiveMapAutomergeDocumentId,
} from "./store/entitiesSlice";
import EntityList from "./components/EntityList";
import { showNewMapDialog } from "./store/uiSlice";
import {
  GetMediaExcerptsResponse,
  notifyTabOfNewMediaExcerpt,
  sendUpdatedMediaExcerptOutcomes,
  sendUpdatedMediaExcerpts,
  sidePanelKeepalivePortName,
} from "./extension/messages";
import { serializeMap } from "./extension/serialization";
import * as appLogger from "./logging/appLogging";
import { catchErrors } from "./extension/callbacks";
import { useRefreshAuth } from "./store/hooks";
import { refreshAuth } from "./store/authSlice";
import { useAppDispatch } from "./store";
import { loadApiEndpointOverride } from "./store/apiConfigSlice";
import ExtensionGraphView from "./graphView/ExtensionGraphView";
import {
  useActiveMap,
  useActiveMapEntities,
  useActiveMapMediaExcerptOutcomes,
  useActiveMapMediaExcerpts,
} from "./sync/hooks";
import { ChromeRuntimeMessage } from "./extension/chromeRuntimeMessages";

import "./App.scss";

const App: React.FC = () => {
  const dispatch = useAppDispatch();
  useSyncMediaExcerptsWithContent();
  useSyncUpdatedMediaExcerptOutcomesWithContent();
  useHandleChromeRuntimeMessage();
  useContentScriptKeepAliveConnection();
  useRefreshAuth();
  useSyncApiConfig();

  // Load initial configs
  useEffect(() => {
    void dispatch(loadApiEndpointOverride());
  }, [dispatch]);

  const documentId = useActiveMapAutomergeDocumentId();
  const activeMap = useActiveMap();
  const graphView = documentId ? (
    activeMap ? (
      <ExtensionGraphView style={styles.graphView} />
    ) : (
      <View style={styles.graphViewPlaceholder}>
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>Opening map</Text>
          <ProgressBar indeterminate={true} style={styles.progressBar} />
        </View>
      </View>
    )
  ) : (
    <View style={styles.graphViewPlaceholder}>
      <Text>No active map.</Text>
      <Button mode="contained" onPress={() => dispatch(showNewMapDialog())}>
        Create new map
      </Button>
    </View>
  );

  return (
    <View style={styles.container}>
      <HeaderBar />
      <View style={styles.content}>
        {graphView}

        <View style={styles.entityEditorContainer}>
          <Text variant="titleMedium">Entity Editor</Text>
          <EntityEditor />
        </View>

        <ScrollView style={styles.entityListScrollView}>
          <EntityList />
        </ScrollView>
      </View>
    </View>
  );
};

function useContentScriptKeepAliveConnection() {
  useEffect(() => {
    connectToOpenTabs().catch((reason) => {
      appLogger.error("Error connecting to open tabls", reason);
    });
    chrome.tabs.onUpdated.addListener(connectToReloadedTabs);
    return () => {
      chrome.tabs.onUpdated.removeListener(connectToReloadedTabs);
    };
  }, []);
}

async function connectToOpenTabs() {
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      connectToTab(tab);
    }
  } catch (error) {
    appLogger.error("Failed to connect to open tabs", error);
  }
}

// TODO: #2 - try to remove this
export const tabConnectDelayMillis = 500;

function connectToReloadedTabs(
  tabId: number,
  info: chrome.tabs.TabChangeInfo,
  tab: chrome.tabs.Tab,
) {
  if (info.status === "complete") {
    // For some reason connecting immediately to just opened tabs fails silently.
    // So wait a little bit before connecting.
    setTimeout(() => connectToTab(tab), tabConnectDelayMillis);
  }
}

function connectToTab(tab: chrome.tabs.Tab) {
  // Discarded tabs aren't listening for us to connect, and URLs
  // lacking a URL are ineligble to connect (chrome internal pages etc.)
  if (!tab.id || tab.discarded || !tab.url) {
    return;
  }
  try {
    chrome.tabs.connect(tab.id, {
      name: sidePanelKeepalivePortName,
    });
  } catch (error) {
    appLogger.error("Failed to connect to tab", error);
  }
}

function useSyncMediaExcerptsWithContent() {
  const mediaExcerpts = useActiveMapMediaExcerpts();

  const [prevMediaExcerpts, setPrevMediaExcerpts] = useState<MediaExcerpt[]>(
    [],
  );

  useEffect(() => {
    const { add, remove } = diffMediaExcerpts(prevMediaExcerpts, mediaExcerpts);
    if (add.length > 0 || remove.length > 0) {
      void sendUpdatedMediaExcerpts({ add, remove });
    }
    setPrevMediaExcerpts(mediaExcerpts);
  }, [mediaExcerpts, prevMediaExcerpts]);
}

function diffMediaExcerpts(
  prevMediaExcerpts: MediaExcerpt[],
  mediaExcerpts: MediaExcerpt[],
) {
  const remove = new Set(prevMediaExcerpts.map((me) => me.id));
  const add = [] as MediaExcerpt[];
  mediaExcerpts.forEach((me) => {
    if (remove.has(me.id)) {
      remove.delete(me.id);
    } else {
      add.push(me);
    }
  });
  return {
    add,
    remove: Array.from(remove),
  };
}

function useSyncUpdatedMediaExcerptOutcomesWithContent() {
  const mediaExcerptOutcomes = useActiveMapMediaExcerptOutcomes();

  // Store the outcomes so that we can diff them when they change
  const [prevMediaExcerptOutcomes, setPrevMediaExcerptOutcomes] = useState<
    Map<string, BasisOutcome>
  >(new Map());

  useEffect(() => {
    const updatedMediaExcerptOutcomes = diffMediaExcerptOutcomes(
      prevMediaExcerptOutcomes,
      mediaExcerptOutcomes,
    );
    if (updatedMediaExcerptOutcomes.size > 0) {
      void sendUpdatedMediaExcerptOutcomes(updatedMediaExcerptOutcomes);
    }
    setPrevMediaExcerptOutcomes(mediaExcerptOutcomes);
  }, [mediaExcerptOutcomes, prevMediaExcerptOutcomes]);
}

function useHandleChromeRuntimeMessage() {
  const entities = useActiveMapEntities();
  const mediaExcerptOutcomes = useActiveMapMediaExcerptOutcomes();

  const dispatch = useAppDispatch();

  const handleChromeRuntimeMessage = useCallback(
    (
      message: ChromeRuntimeMessage,
      sender: chrome.runtime.MessageSender,
      sendResponse: (response: unknown) => void,
    ) => {
      catchErrors(() => {
        switch (message.action) {
          case "authStateChanged":
            void (async () => {
              try {
                await dispatch(refreshAuth()).unwrap();
              } catch (error) {
                appLogger.error(
                  "Failed to refresh auth after state change",
                  error,
                );
              }
            })();
            break;
          case "addMediaExcerpt":
            dispatch(addMediaExcerpt(message.data));
            void notifyTabsOfNewMediaExcerpt(sender.tab, message.data);
            break;
          case "selectMediaExcerpt":
            dispatch(selectEntities([message.data.mediaExcerptId]));
            break;
          case "getMediaExcerpt": {
            sendResponse(
              entities.find((e) => e.id === message.data.mediaExcerptId),
            );
            break;
          }
          case "getMediaExcerpts": {
            const mediaExcerpts = entities.filter((entity) => {
              if (entity.type !== "MediaExcerpt") {
                return false;
              }
              return isMatchingUrlInfo(entity.urlInfo, message.data);
            }) as MediaExcerpt[];

            // Serialize for responding to the content script since Maps cannot
            // pass the runtime boundary
            const serializedOutcomes = serializeMap(mediaExcerptOutcomes);
            const response: GetMediaExcerptsResponse = {
              mediaExcerpts,
              serializedOutcomes,
            };
            sendResponse(response);
            break;
          }
        }
      });
    },
    [dispatch, entities, mediaExcerptOutcomes],
  );
  useEffect(() => {
    chrome.runtime.onMessage.addListener(handleChromeRuntimeMessage);
    return () => {
      chrome.runtime.onMessage.removeListener(handleChromeRuntimeMessage);
    };
  }, [handleChromeRuntimeMessage]);
}

async function notifyTabsOfNewMediaExcerpt(
  originTab: chrome.tabs.Tab | undefined,
  data: AddMediaExcerptData,
) {
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (tab.id && tab.id === originTab?.id) {
      // Skip the tab that created the MediaExcerpt
      continue;
    }
    await notifyTabOfNewMediaExcerpt(tab, data);
  }
}

function useSyncApiConfig() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const handleStorageChange = (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string,
    ) => {
      if (areaName === "local" && "apiEndpointOverride" in changes) {
        // Load the new value into the store
        void dispatch(loadApiEndpointOverride());
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, [dispatch]);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
  },
  content: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
  },
  graphView: {
    flex: 1,
  },
  graphViewPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  progressContainer: {
    alignItems: "center",
    width: "100%",
    padding: 16,
  },
  progressBar: {
    width: "100%",
    marginTop: 8,
  },
  progressText: {
    textAlign: "center",
  },
  entityListScrollView: {
    flexShrink: 0,
    maxHeight: "33%",
  },
  entityEditorContainer: {
    paddingLeft: 16,
    paddingRight: 16,
    paddingBottom: 16,
    flexShrink: 0,
    maxHeight: "50%",
  },
});

export default App;

/** Return a map containing only the outcomes in newOutcomes that differ from oldOutcome.
 * If an outcome is missing from newOutcomes, return undefined for the outcome.
 */
export function diffMediaExcerptOutcomes(
  oldOutcomes: Map<string, BasisOutcome>,
  newOutcomes: Map<string, BasisOutcome>,
): Map<string, BasisOutcome | undefined> {
  const diffOutcomes = new Map<string, BasisOutcome | undefined>();

  // Check for outcomes that are in newOutcomes but different or missing in oldOutcomes
  for (const [key, newOutcome] of newOutcomes) {
    if (!oldOutcomes.has(key) || oldOutcomes.get(key) !== newOutcome) {
      diffOutcomes.set(key, newOutcome);
    }
  }

  // Check for outcomes that are in oldOutcomes but missing in newOutcomes
  for (const key of oldOutcomes.keys()) {
    if (!newOutcomes.has(key)) {
      diffOutcomes.set(key, undefined);
    }
  }

  return diffOutcomes;
}
