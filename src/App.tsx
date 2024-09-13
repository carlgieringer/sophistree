// src/App.tsx
import React, { useEffect } from "react";
import { Provider, useDispatch } from "react-redux";
import { store } from "./store";
import { addMediaExcerpt, selectNode } from "./store/nodesSlice";
import NodeList from "./components/NodeList";
import GraphView from "./components/GraphView";
import NodeEditor from "./components/NodeEditor";

import "./App.css";
import { ChromeRuntimeMessage } from "./content";
const AppContent: React.FC = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    function handleChromeRuntimeMessage(message: ChromeRuntimeMessage) {
      switch (message.action) {
        case "addMediaExcerpt": {
          dispatch(addMediaExcerpt(message.data));
          break;
        }
        case "selectMediaExcerpt": {
          dispatch(selectNode(message.data.mediaExcerptId));
          break;
        }
      }
    }
    chrome.runtime.onMessage.addListener(handleChromeRuntimeMessage);
    return () => {
      chrome.runtime.onMessage.removeListener(handleChromeRuntimeMessage);
    };
  }, [dispatch]);

  const handleReload = () => {
    chrome.runtime.reload();
  };

  return (
    <div className="sophistree-sidebar">
      <header>
        <h1>Sophistree</h1>
      </header>
      <main>
        <section className="node-list">
          <h2>Nodes</h2>
          <NodeList />
        </section>
        <section className="graph-view">
          <h2>Argument Map</h2>
          <GraphView />
        </section>
        <section className="node-editor">
          <h2>Node Editor</h2>
          <NodeEditor />
        </section>
      </main>
      <footer>
        <button>Export</button>
        <button>Import</button>
        <button onClick={handleReload}>Reload Extension</button>
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
