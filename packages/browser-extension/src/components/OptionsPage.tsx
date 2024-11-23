import React from "react";
import { useRefreshAuth } from "../store/hooks";
import { AuthenticationCard } from "./AuthenticationCard";
import { ApiEndpointOverrideSetting } from "./ApiEndpointOverrideSetting";

export function OptionsPage() {
  useRefreshAuth();

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Sophistree Options</h1>
      <AuthenticationCard />
      <ApiEndpointOverrideSetting />
    </div>
  );
}

const styles = {
  container: {
    maxWidth: "800px",
    margin: "0 auto",
    padding: "2rem",
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif",
  },
  title: {
    fontSize: "2rem",
    color: "#333",
    marginBottom: "2rem",
    textAlign: "center" as const,
  },
};
