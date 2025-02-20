"use client";

import React from "react";
import { Providers } from "./providers";
import { Roboto } from "next/font/google";
import localFont from "next/font/local";

const roboto = Roboto({ weight: ["400", "500", "700"], subsets: ["latin"] });
const materialIcons = localFont({
  src: "../../public/fonts/MaterialIcons.ttf",
});
const materialCommunityIcons = localFont({
  src: "../../public/fonts/MaterialCommunityIcons.ttf",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <style jsx global>{`
        html {
          font-family: ${roboto.style.fontFamily};
        }
        // Override react-native-vector-icons font-family with next.js's local fonts
        [style*="font-family: MaterialIcons;"] {
          font-family: ${materialIcons.style.fontFamily} !important;
        }
        [style*="font-family: MaterialCommunityIcons;"] {
          font-family: ${materialCommunityIcons.style.fontFamily} !important;
        }
        [data-testid="tooltip-container"] {
          position: fixed;
        }
      `}</style>
      <body style={{ margin: 0 }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
