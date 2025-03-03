import React from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

import AppBottomSheet from "./components/AppBottomSheet";
import { GestureHandlerRootView } from "./bottomsheet-setup";
import AppContainer from "./components/AppContainer";
import HeaderBar from "./components/HeaderBar";

import "./App.scss";

const App: React.FC = () => {
  const graphView = (
    <View style={styles.graphViewPlaceholder}>
      <Text>No active map.</Text>
    </View>
  );
  return (
    <GestureHandlerRootView style={styles.gestureRoot}>
      <AppContainer style={styles.container}>
        <HeaderBar />
        {graphView}
        <AppBottomSheet />
      </AppContainer>
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
  progressContainer: {
    alignItems: "center",
    width: "100%",
    padding: 16,
  },
  progressBar: {
    width: "100%",
    marginTop: 8,
  },
  progressText: {
    textAlign: "center",
  },
});

export default App;
