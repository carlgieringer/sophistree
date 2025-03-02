import React, { useEffect, useMemo, useRef } from "react";
import { StyleSheet } from "react-native";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";

import * as appLogger from "../logging/appLogging";
import EntityList from "./EntityList";

const AppBottomSheet: React.FC = () => {
  const initialSnapIndex = 1;
  const snapPoints = useMemo(() => ["5%", "25%", "50%", "90%"], []);

  const bottomSheetRef = useRef<BottomSheet>(null);

  useFixBottomSheetPosition(snapPoints, initialSnapIndex);

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={initialSnapIndex}
      snapPoints={snapPoints}
      handleIndicatorStyle={styles.handleIndicator}
      backgroundStyle={styles.bottomSheetBackground}
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

/**
 * For some reason when maxDynamicContentSize=true (the default), the sheet starts
 * with translateY set to the full height of the container, which pushes it completely
 * out of view. (And when maxDynamicContentSize=false, we can't scroll to view the entire
 * sheet contents, so we can't set that.)
 *
 * This method uses a hacky workaround to reset the element's translateY
 * to the initial snap point when it is off-screen. This method may require updating if @gorhom/bottom-sheet
 * updates their DOM.
 */
function useFixBottomSheetPosition(
  snapPoints: string[],
  initialSnapIndex: number,
) {
  useEffect(() => {
    // There are two elements matching this selector; they are siblings and so both have the parent
    // we want, so just take the first.
    const [sheetSlider] = window.document.querySelectorAll(
      `[aria-label="Bottom Sheet"][role="slider"]`,
    );

    if (!sheetSlider?.parentElement) return;

    const fixBottomSheetTranslation = (container: Element) => {
      const containerHeight = container.clientHeight;
      const snapPointPercentage = parseInt(
        snapPoints[initialSnapIndex].replace("%", ""),
      );
      const correctedTranslationY =
        containerHeight * ((100 - snapPointPercentage) / 100);

      sheetSlider.parentElement!.style.transform = `translateY(${correctedTranslationY}px)`;
    };

    // Fix initial position
    const container = sheetSlider.parentElement.parentElement;
    if (container) {
      setTimeout(() => fixBottomSheetTranslation(container), 500);
    }

    // Keep track of the previous transform value to avoid unnecessary updates
    let prevTransform = "";

    // Function to check for style changes using requestAnimationFrame
    const checkStyleChanges = () => {
      if (!container) return;

      const transform = sheetSlider.parentElement?.style.transform || "";

      // Only process if the transform has changed
      if (transform !== prevTransform) {
        prevTransform = transform;
        const match = /translateY\((\d+)px\)/.exec(transform);

        if (match) {
          const translateY = parseInt(match[1]);
          const containerHeight = container.clientHeight;

          if (translateY >= containerHeight) {
            fixBottomSheetTranslation(container);
          }

          // Log position changes
          appLogger.debug("Fixed BottomSheet translateY:", translateY);
        }
      }

      // Continue monitoring
      requestAnimationFrame(checkStyleChanges);
    };

    const rafId = requestAnimationFrame(checkStyleChanges);

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [snapPoints, initialSnapIndex]);
}
