import React, { useEffect, useMemo, useRef } from "react";
import { StyleSheet } from "react-native";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { TabScreen, Tabs, TabsProvider } from "react-native-paper-tabs";

import EntityList from "./EntityList";
import MapHistory from "./MapHistory";

const AppBottomSheet: React.FC = () => {
  const initialSnapIndex = 1;
  const snapPoints = useMemo(() => ["5%", "25%", "50%", "90%"], []);

  const bottomSheetRef = useRef<BottomSheet>(null);

  useFixBottomSheetPosition(snapPoints, initialSnapIndex);

  const handleSheetChange = (index: number) => {
    console.log("Sheet index changed:", index);
  };

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={initialSnapIndex}
      snapPoints={snapPoints}
      handleIndicatorStyle={styles.handleIndicator}
      backgroundStyle={styles.bottomSheetBackground}
      backdropComponent={() => null}
      onChange={handleSheetChange}
    >
      <TabsProvider>
        <Tabs mode="scrollable" showLeadingSpace={false}>
          <TabScreen label="Entities">
            <BottomSheetScrollView
              contentContainerStyle={styles.contentContainer}
            >
              <EntityList />
            </BottomSheetScrollView>
          </TabScreen>
          <TabScreen label="History">
            <BottomSheetScrollView
              contentContainerStyle={styles.contentContainer}
            >
              <MapHistory />
            </BottomSheetScrollView>
          </TabScreen>
        </Tabs>
      </TabsProvider>
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
 * Custom hook that manages the bottom sheet's position, including:
 * 1. Fixing the initial display position (when maxDynamicContentSize=true)
 * 2. Tracking position changes through requestAnimationFrame
 * 3. Correcting out-of-bounds positions
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
          console.log("Fixed BottomSheet translateY:", translateY);
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
