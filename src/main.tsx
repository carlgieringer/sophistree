import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { PaperProvider, MD3LightTheme } from "react-native-paper";

import { store } from "./store";
import App from "./App";

// Workaround for https://github.com/callstack/react-native-paper/issues/2908#issue-1001003536.
window.global = window.globalThis;

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Provider store={store}>
      <PaperProvider theme={MD3LightTheme}>
        <App />
      </PaperProvider>
    </Provider>
  </React.StrictMode>
);
