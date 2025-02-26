import React, { useMemo, useRef } from "react";
import { StyleSheet } from "react-native";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";

import EntityList from "./EntityList";

const AppBottomSheet: React.FC = () => {
  const bottomSheetRef = useRef<BottomSheet>(null);

  const snapPoints = useMemo(() => ["5%", "25%", "50%", "90%"], []);

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={1}
      snapPoints={snapPoints}
      handleIndicatorStyle={styles.handleIndicator}
      enablePanDownToClose={false}
      enableDynamicSizing={false}
      enableOverDrag={true}
      detached={true}
      backgroundStyle={styles.bottomSheetBackground}
      backdropComponent={() => null}
    >
      <BottomSheetScrollView contentContainerStyle={styles.contentContainer}>
        <EntityList />
      </BottomSheetScrollView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  handleIndicator: {
    backgroundColor: "#A0A0A0",
    width: 50,
  },
  bottomSheetBackground: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -3,
    },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
});

export default AppBottomSheet;
