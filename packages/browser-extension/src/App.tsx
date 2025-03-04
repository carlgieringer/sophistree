import React from "react";
import { StyleSheet } from "react-native";

import AppBottomSheet from "./components/AppBottomSheet";
import { GestureHandlerRootView } from "./bottomsheet-setup";
import AppContainer from "./components/AppContainer";
import HeaderBar from "./components/HeaderBar";
import { Portal } from "react-native-paper";

const App: React.FC = () => {
  return (
    <GestureHandlerRootView style={styles.gestureRoot}>
      <Portal>
        <AppContainer style={styles.container}>
          <HeaderBar />
          <AppBottomSheet />
        </AppContainer>
      </Portal>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  gestureRoot: {
    flex: 1,
  },
  container: {
    display: "flex",
    flexDirection: "column",
  },
  graphViewPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default App;
