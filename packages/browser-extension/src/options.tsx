import React from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { store } from "./store/store";
import { OptionsPage } from "./components/OptionsPage";

const container = document.getElementById("root");
const root = createRoot(container!);

root.render(
  <React.StrictMode>
    <Provider store={store}>
      <OptionsPage />
    </Provider>
  </React.StrictMode>,
);
