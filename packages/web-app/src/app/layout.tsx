import React from "react";
import { Providers } from "./providers";

export const metadata = {
  title: "Sophistree",
  description: "Argument mapping platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" style={{ height: "100%" }}>
      <head>
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css?family=Roboto:300,400,500,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ height: "100%", margin: 0 }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
