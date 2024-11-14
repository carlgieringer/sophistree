import React from "react";
import { Providers } from "./providers";
import { GoogleOAuthProvider } from "@react-oauth/google";

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
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css?family=Roboto:300,400,500,700"
          rel="stylesheet"
        />
      </head>
      <body style={{ margin: 0 }}>
        <GoogleOAuthProvider clientId={process.env.GOOGLE_CLIENT_ID ?? ""}>
          <Providers>{children}</Providers>
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}
