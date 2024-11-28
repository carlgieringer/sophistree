"use client";

import React from "react";
import { PaperProvider } from "react-native-paper";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PaperProvider>
      <div style={{ height: "100vh" }}>{children}</div>
    </PaperProvider>
  );
}
