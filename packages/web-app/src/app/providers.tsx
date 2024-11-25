"use client";

import React from "react";
import { Platform } from "react-native";
import { PaperProvider } from "react-native-paper";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PaperProvider>
      <React.Fragment>
        {Platform.OS === "web" ? (
          <style type="text/css">{`
        @font-face {
          font-family: 'MaterialCommunityIcons';
          src: url(${require("react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf")}) format('truetype');
        }
      `}</style>
        ) : null}
        {children}
      </React.Fragment>
    </PaperProvider>
  );
}
