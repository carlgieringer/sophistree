import React, { useEffect, useMemo, useState } from "react";
import { StyleProp, StyleSheet, ViewStyle } from "react-native";
import BottomSheet from "@gorhom/bottom-sheet";
import { TabScreen, Tabs, TabsProvider } from "react-native-paper-tabs";

import EntityList from "./EntityList";
import MapHistory from "./MapHistory";

const AppBottomSheet: React.FC = () => {
  const snapPoints = useMemo(() => ["5%", "25%", "50%", "90%"], []);
  const maxHeight = useBottomSheetHeight();
  const sheetContentStyle: StyleProp<ViewStyle> = {
    // Give tab contents a max height and scroll or else we can't scroll the whole contents when
    // the sheet is less than fully expanded.
    maxHeight,
    overflow: "scroll",
    paddingBottom: 16,
  };
  return (
    <BottomSheet
      index={1}
      snapPoints={snapPoints}
      handleIndicatorStyle={styles.handleIndicator}
      backgroundStyle={styles.bottomSheet}
      // The sheet disappears (translateY is off the screen) with dynamic sizing.
      enableDynamicSizing={false}
    >
      <TabsProvider>
        <Tabs mode="scrollable" showLeadingSpace={false}>
          <TabScreen label="Entities">
            <EntityList style={sheetContentStyle} />
          </TabScreen>
          <TabScreen label="History">
            <MapHistory style={sheetContentStyle} />
          </TabScreen>
        </Tabs>
      </TabsProvider>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  handleIndicator: {
    backgroundColor: "#A0A0A0",
    width: 50,
  },
  bottomSheet: {
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
 * Poll in RAF for the bottom sheet's height.
 */
function useBottomSheetHeight() {
  const [height, setHeight] = useState(undefined as number | undefined);

  useEffect(() => {
    // There are two elements matching this selector; they are siblings and so both have the parent
    // we want, so just take the first.
    const [sheetSlider, sheetSliderContainer] =
      window.document.querySelectorAll(
        `[aria-label="Bottom Sheet"][role="slider"]`,
      );

    // Function to check for style changes using requestAnimationFrame
    const checkSheetHeight = () => {
      const container = sheetSlider.parentElement?.parentElement;
      if (!container) {
        return;
      }
      // The tab controls also take up space the sheet contents can't use.
      const tabControls =
        sheetSliderContainer.children[0].children[0].children[0].children[0];
      if (!tabControls) {
        return;
      }

      const transform = sheetSlider.parentElement.style.transform || "";

      const match = /translateY\((.+)px\)/.exec(transform);

      if (match) {
        const translateY = parseInt(match[1]);
        const containerHeight = container.clientHeight;
        const tabControlsHeight = tabControls.clientHeight;

        const sheetHeight = containerHeight - tabControlsHeight - translateY;
        setHeight(sheetHeight);
      }

      // Continue monitoring
      requestAnimationFrame(checkSheetHeight);
    };

    const rafId = requestAnimationFrame(checkSheetHeight);

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, []);

  return height;
}

export default AppBottomSheet;
