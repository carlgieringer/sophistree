import React, { useEffect } from "react";
import { StyleSheet, View, ScrollView } from "react-native";
import { Text } from "react-native-paper";
import { useDispatch, useSelector } from "react-redux";

import "./App.scss";
import EntityEditor from "./components/EntityEditor";
import GraphView from "./components/GraphView";
import HeaderBar from "./components/HeaderBar";
import { ChromeRuntimeMessage } from "./content";
import { addMediaExcerpt, selectEntity } from "./store/entitiesSlice";
import EntityList from "./components/EntityList";
import * as selectors from "./store/selectors";

const App: React.FC = () => {
  const dispatch = useDispatch();

  const entities = useSelector(selectors.activeMapEntities);

  useEffect(() => {
    function handleChromeRuntimeMessage(
      message: ChromeRuntimeMessage,
      sender: chrome.runtime.MessageSender,
      sendResponse: (response: any) => void
    ) {
      switch (message.action) {
        case "addMediaExcerpt": {
          dispatch(addMediaExcerpt(message.data));
          break;
        }
        case "selectMediaExcerpt": {
          dispatch(selectEntity(message.data.mediaExcerptId));
          break;
        }
        case "getMediaExcerpts": {
          const { url, canonicalUrl } = message.data;
          const mediaExcerpts = entities.filter(
            (entity) =>
              entity.type === "MediaExcerpt" &&
              (entity.canonicalUrl
                ? entity.canonicalUrl === canonicalUrl
                : entity.url === url)
          );
          sendResponse({ mediaExcerpts });
          break;
        }
      }
    }
    chrome.runtime.onMessage.addListener(handleChromeRuntimeMessage);
    return () => {
      chrome.runtime.onMessage.removeListener(handleChromeRuntimeMessage);
    };
  }, [dispatch, entities]);

  const activeMapId = useSelector(selectors.activeMapId);
  const graphView = activeMapId ? (
    <GraphView style={styles.graphView} />
  ) : (
    <View style={styles.graphViewPlaceholder}>
      <Text>No active map.</Text>
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
