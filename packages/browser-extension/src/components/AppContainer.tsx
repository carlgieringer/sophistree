import React, { useEffect, useState } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";

export default function AppContainer({
  children,
  style,
}: React.PropsWithChildren<{
  style?: ViewStyle;
}>) {
  const [dimensions, setDimensions] = useState(() => {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
    };
  });

  // Update dimensions on resize
  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <View
      style={[
        style,
        styles.container,
        { width: dimensions.width, height: dimensions.height },
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create<{
  container: ViewStyle;
}>({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
});
