import React from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { MD3LightTheme, PaperProvider } from "react-native-paper";

import { store } from "./store/store";
import { OptionsPage } from "./components/OptionsPage";

import "./base.scss";

const container = document.getElementById("root");
const root = createRoot(container!);

// Workaround for https://github.com/callstack/react-native-paper/issues/2908#issue-1001003536.
window.global = window.globalThis;

root.render(
  <React.StrictMode>
    <Provider store={store}>
      <PaperProvider theme={MD3LightTheme}>
        <OptionsPage />
      </PaperProvider>
    </Provider>
  </React.StrictMode>,
);
