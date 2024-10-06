import React, { useEffect } from "react";
import { StyleSheet, View, ScrollView } from "react-native";
import { Button, Text } from "react-native-paper";
import { useDispatch, useSelector } from "react-redux";

import "./App.scss";
import EntityEditor from "./components/EntityEditor";
import GraphView from "./components/GraphView";
import HeaderBar from "./components/HeaderBar";
import { ChromeRuntimeMessage } from "./content";
import {
  addMediaExcerpt,
  MediaExcerpt,
  selectEntities,
} from "./store/entitiesSlice";
import EntityList from "./components/EntityList";
import * as selectors from "./store/selectors";
import { showNewMapDialog } from "./store/uiSlice";
import { BasisOutcome } from "./outcomes/outcomes";
import {
  GetMediaExcerptsResponse,
  sendUpdatedMediaExcerptOutcomes,
} from "./extension/messages";
import { serializeMap } from "./extension/serialization";
import { wrapCallback } from "./extension/callbacks";

const App: React.FC = () => {
  const dispatch = useDispatch();
  useSendUpdatedMediaExcerptOutcomes();
  useHandleChromeRuntimeMessage();

  const activeMapId = useSelector(selectors.activeMapId);
  const graphView = activeMapId ? (
    <GraphView style={styles.graphView} />
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

function useSendUpdatedMediaExcerptOutcomes() {
  const mediaExcerptOutcomes = useSelector(
    selectors.activeMapMediaExcerptOutcomes,
  );

  // Store the outcomes so that we can diff them when they change
  const [prevMediaExcerptOutcomes, setPrevMediaExcerptOutcomes] =
    React.useState<Map<string, BasisOutcome>>(new Map());

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
  const dispatch = useDispatch();
  const entities = useSelector(selectors.activeMapEntities);
  const mediaExcerptOutcomes = useSelector(
    selectors.activeMapMediaExcerptOutcomes,
  );
  useEffect(() => {
    const handleChromeRuntimeMessage = wrapCallback(
      function handleChromeRuntimeMessage(message: ChromeRuntimeMessage) {
        switch (message.action) {
          case "addMediaExcerpt":
            dispatch(addMediaExcerpt(message.data));
            break;
          case "selectMediaExcerpt":
            dispatch(selectEntities([message.data.mediaExcerptId]));
            break;
          case "checkMediaExcerptExistence":
            return (
              entities.find((e) => e.id === message.data.mediaExcerptId) !==
              undefined
            );
          case "getMediaExcerpts": {
            const { url, canonicalUrl } = message.data;
            const mediaExcerpts = entities.filter(
              (entity) =>
                entity.type === "MediaExcerpt" &&
                (entity.urlInfo.canonicalUrl
                  ? entity.urlInfo.canonicalUrl === canonicalUrl
                  : entity.urlInfo.url === url),
            ) as MediaExcerpt[];

            // Serialize for responding to the content script since Maps cannot
            // pass the runtime boundary
            const serializedOutcomes = serializeMap(mediaExcerptOutcomes);
            const response: GetMediaExcerptsResponse = {
              mediaExcerpts,
              serializedOutcomes,
            };
            return response;
          }
        }
      },
    );
    chrome.runtime.onMessage.addListener(handleChromeRuntimeMessage);
    return () => {
      chrome.runtime.onMessage.removeListener(handleChromeRuntimeMessage);
    };
  }, [dispatch, entities, mediaExcerptOutcomes]);
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
