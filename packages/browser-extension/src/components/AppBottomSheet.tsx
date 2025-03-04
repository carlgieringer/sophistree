import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet } from "react-native";
import BottomSheet from "@gorhom/bottom-sheet";

import EntityList from "./EntityList";

const AppBottomSheet: React.FC = () => {
  const snapPoints = useMemo(() => ["5%", "25%", "50%", "90%"], []);
  const maxHeight = useBottomSheetHeight();
  return (
    <BottomSheet
      index={1}
      snapPoints={snapPoints}
      handleIndicatorStyle={styles.handleIndicator}
      backgroundStyle={styles.bottomSheet}
      // The sheet disappears (translateY is off the screen) with dynamic sizing.
      enableDynamicSizing={false}
    >
      <EntityList
        style={{
          // Give the list a max height and scroll or else we can't scroll the whole contents when
          // the sheet is less than fully expanded.
          maxHeight,
          overflow: "scroll",
          paddingBottom: 16,
        }}
      />
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
    const [sheetSlider] = window.document.querySelectorAll(
      `[aria-label="Bottom Sheet"][role="slider"]`,
    );

    // Function to check for style changes using requestAnimationFrame
    const checkSheetHeight = () => {
      const container = sheetSlider.parentElement?.parentElement;
      if (!container) return;

      const transform = sheetSlider.parentElement.style.transform || "";

      const match = /translateY\((.+)px\)/.exec(transform);

      if (match) {
        const translateY = parseInt(match[1]);
        const containerHeight = container.clientHeight;

        const sheetHeight = containerHeight - translateY;
        setHeight(sheetHeight);
        console.log({ containerHeight, translateY, sheetHeight });
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
