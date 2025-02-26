import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { PaperProvider, MD3LightTheme } from "react-native-paper";

import App from "./App";
import { store } from "./store";

import "./base.scss";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Provider store={store}>
      <PaperProvider theme={MD3LightTheme}>
        <App />
      </PaperProvider>
    </Provider>
  </React.StrictMode>,
);
