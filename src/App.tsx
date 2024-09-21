// src/App.tsx
import React, { useEffect } from "react";
import { Provider, useDispatch, useSelector } from "react-redux";

import { RootState, store } from "./store";
import { addMediaExcerpt, selectEntity } from "./store/entitiesSlice";
import GraphView from "./components/GraphView";
import EntityEditor from "./components/EntityEditor";
import { ChromeRuntimeMessage } from "./content";
import "./App.scss";
import HeaderBar from "./components/HeaderBar";

const AppContent: React.FC = () => {
  const dispatch = useDispatch();

  const maps = useSelector((state: RootState) => state.entities.maps);
  const activeMapId = useSelector(
    (state: RootState) => state.entities.activeMapId
  );
  const activeMapName = maps.find((m) => m.id === activeMapId)?.name || "";
  const entities = maps.find((m) => m.id === activeMapId)?.entities || [];

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

  return (
    <div className="sophistree-sidebar">
      <HeaderBar />
      <main>
        <section className="graph-view">
          <GraphView />
        </section>
        <section className="entity-editor">
          <h2>Entity Editor</h2>
          <EntityEditor />
        </section>
      </main>
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
