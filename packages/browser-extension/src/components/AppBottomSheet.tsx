import React, { RefObject, useEffect, useMemo, useRef } from "react";
import { StyleSheet } from "react-native";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";

import EntityList from "./EntityList";

const AppBottomSheet: React.FC = () => {
  const initialSnapIndex = 1;
  const snapPoints = useMemo(() => ["5%", "25%", "50%", "90%"], []);

  const bottomSheetRef = useRef<BottomSheet>(null);

  useFixBottomSheetInitialDisplay(snapPoints, initialSnapIndex, bottomSheetRef);

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={initialSnapIndex}
      snapPoints={snapPoints}
      handleIndicatorStyle={styles.handleIndicator}
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

/**
 * For some reason when maxDynamicContentSize=true (the default), the sheet starts
 * with translateY set to the full height of the container, which pushes it completely
 * out of view. (And when maxDynamicContentSize=false, we can't scroll to view the entire
 * sheet contents, so we can't set that.)
 *
 * This method uses a hacky workaround to initially manually set the element's translateY
 * to the initial snap point. This method may require updating if @gorhom/bottom-sheet
 * updates their DOM.
 */
function useFixBottomSheetInitialDisplay(
  snapPoints: string[],
  initialSnapIndex: number,
  bottomSheetRef: RefObject<BottomSheet>,
) {
  useEffect(() => {
    // There are two elements matching this selector; take the first which should be
    // the parent of the other.
    const [sheetSlider] = window.document.querySelectorAll(
      `[aria-label="Bottom Sheet"][role="slider"]`,
    );
    setTimeout(() => {
      if (sheetSlider.parentElement?.style) {
        const container = sheetSlider.parentElement.parentElement;
        if (container) {
          const containerHeight = container.clientHeight;
          const snapPointPercentage = parseInt(
            snapPoints[initialSnapIndex].replace("%", ""),
          );
          const translationY =
            containerHeight * ((100 - snapPointPercentage) / 100);
          sheetSlider.parentElement.style.transform = `translateY(${translationY}px)`;
        }
      }
    }, 500);
  }, [snapPoints, initialSnapIndex, bottomSheetRef]);
}

export default AppBottomSheet;
