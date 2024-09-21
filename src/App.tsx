// src/App.tsx
import React, { useEffect } from "react";
import { Provider, useDispatch, useSelector } from "react-redux";
import { Button } from "react-native-paper";

import { RootState, store } from "./store";
import { addMediaExcerpt, selectEntity } from "./store/entitiesSlice";
import GraphView from "./components/GraphView";
import EntityEditor from "./components/EntityEditor";
import { ChromeRuntimeMessage } from "./content";
import "./App.scss";
import DownloadButton from "./components/DownloadButton";

const AppContent: React.FC = () => {
  const dispatch = useDispatch();

  const entities = useSelector((state: RootState) => state.entities.entities);

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

  const handleReload = () => {
    chrome.runtime.reload();
  };

  return (
    <div className="sophistree-sidebar">
      <header>
        <img className="logo" src="./logo-32.png" alt="Sophistree Logo" />
        <h1>Sophistree</h1>
      </header>
      <main>
        <section className="graph-view">
          <GraphView />
        </section>
        <section className="entity-editor">
          <h2>Entity Editor</h2>
          <EntityEditor />
        </section>
      </main>
      <footer>
        <DownloadButton />
        <Button onPress={handleReload}>Reload Extension</Button>
      </footer>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
};

export default App;
