// src/App.tsx
import React from 'react';
import { Provider } from 'react-redux';
import { store } from './store';
import './App.css';

import NodeList from './components/NodeList';
import GraphView from './components/GraphView';
import NodeEditor from './components/NodeEditor';

const App: React.FC = () => {
  return (
    <Provider store={store}>
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
        </footer>
      </div>
    </Provider>
  );
};

export default App;
