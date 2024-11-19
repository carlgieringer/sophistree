import React, { useState } from "react";
import { useSelector } from "react-redux";
import { saveApiEndpointOverride } from "../store/apiConfigSlice";
import { RootState, useAppDispatch } from "../store/store";
import * as appLogger from "../logging/appLogging";

export function ApiEndpointOverrideSetting() {
  const dispatch = useAppDispatch();
  const apiEndpointOverride = useSelector(
    (state: RootState) => state.apiConfig.apiEndpointOverride,
  );
  const [inputValue, setInputValue] = useState(apiEndpointOverride || "");

  const handleSave = () => {
    dispatch(saveApiEndpointOverride(inputValue || undefined))
      .unwrap()
      .catch((reason) =>
        appLogger.error("Failed to save API endpoint override", reason),
      );
  };

  const handleReset = () => {
    dispatch(saveApiEndpointOverride(undefined))
      .unwrap()
      .catch((reason) =>
        appLogger.error("Failed to reset API endpoint override", reason),
      );
    setInputValue("");
  };

  return (
    <div style={styles.section}>
      <h2 style={styles.sectionTitle}>API Configuration</h2>
      <div style={styles.inputGroup}>
        <label style={styles.label}>
          API Endpoint Override:
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={process.env.NEXT_PUBLIC_API_URL}
            style={styles.input}
          />
        </label>
        <div style={styles.buttonGroup}>
          <button onClick={handleSave} style={styles.button}>
            Save
          </button>
          <button onClick={handleReset} style={styles.button}>
            Reset to Default
          </button>
        </div>
        {apiEndpointOverride && (
          <p style={styles.note}>
            Currently using custom API endpoint: {apiEndpointOverride}
          </p>
        )}
      </div>
    </div>
  );
}

const styles = {
  section: {
    marginTop: "2rem",
    padding: "1.5rem",
    backgroundColor: "#f5f5f5",
    borderRadius: "8px",
  },
  sectionTitle: {
    fontSize: "1.5rem",
    color: "#333",
    marginBottom: "1rem",
  },
  inputGroup: {
    marginBottom: "1rem",
  },
  label: {
    display: "block",
    marginBottom: "0.5rem",
    color: "#555",
  },
  input: {
    display: "block",
    width: "100%",
    padding: "0.5rem",
    marginTop: "0.25rem",
    border: "1px solid #ddd",
    borderRadius: "4px",
    fontSize: "1rem",
  },
  buttonGroup: {
    marginTop: "1rem",
    display: "flex",
    gap: "0.5rem",
  },
  button: {
    padding: "0.5rem 1rem",
    backgroundColor: "#007bff",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "0.9rem",
  },
  note: {
    marginTop: "0.5rem",
    color: "#666",
    fontSize: "0.9rem",
    fontStyle: "italic",
  },
};
