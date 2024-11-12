import React from "react";
import { useSelector } from "react-redux";
import { RootState, useAppDispatch } from "../store/store";
import { signIn, signOut } from "../store/authSlice";
import { useRefreshAuth } from "../store/hooks";

export function OptionsPage() {
  useRefreshAuth();

  const dispatch = useAppDispatch();
  const handleSignIn = async () => {
    await dispatch(signIn()).unwrap();
  };
  const handleSignOut = async () => {
    await dispatch(signOut()).unwrap();
  };

  const { user, isAuthenticated, error } = useSelector(
    (state: RootState) => state.auth,
  );
  const isLoading = useSelector((state: RootState) => state.auth.isLoading);

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Sophistree Options</h1>

      <div style={styles.card}>
        <h2 style={styles.subtitle}>Authentication</h2>

        {isAuthenticated ? (
          <div style={styles.userInfo}>
            {user?.picture && (
              <img src={user.picture} alt="Profile" style={styles.profilePic} />
            )}
            <p style={styles.welcomeText}>Welcome, {user?.name}</p>
            <button
              onClick={() => void handleSignOut()}
              style={styles.button}
              disabled={isLoading}
            >
              {isLoading ? "Signing out..." : "Sign Out"}
            </button>
          </div>
        ) : (
          <div style={styles.signInContainer}>
            <p style={styles.text}>
              Sign in to sync your Sophistree data across devices
            </p>
            <button
              onClick={() => void handleSignIn()}
              style={styles.button}
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Sign in with Google"}
            </button>
          </div>
        )}

        {error && <p style={styles.error}>{error}</p>}
      </div>
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
  card: {
    backgroundColor: "white",
    borderRadius: "8px",
    padding: "2rem",
    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
    maxWidth: "400px",
    margin: "0 auto",
  },
  subtitle: {
    fontSize: "1.5rem",
    color: "#444",
    marginBottom: "1.5rem",
    textAlign: "center" as const,
  },
  userInfo: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: "1rem",
  },
  profilePic: {
    width: "80px",
    height: "80px",
    borderRadius: "50%",
    border: "2px solid #eee",
  },
  welcomeText: {
    fontSize: "1.1rem",
    color: "#333",
    margin: "0",
  },
  signInContainer: {
    textAlign: "center" as const,
  },
  text: {
    color: "#666",
    marginBottom: "1.5rem",
    lineHeight: "1.5",
  },
  button: {
    backgroundColor: "#4285f4",
    color: "white",
    border: "none",
    padding: "0.75rem 1.5rem",
    borderRadius: "4px",
    fontSize: "1rem",
    cursor: "pointer",
    transition: "background-color 0.2s",
    ":hover": {
      backgroundColor: "#3367d6",
    },
    ":disabled": {
      backgroundColor: "#9e9e9e",
      cursor: "not-allowed",
    },
  },
  error: {
    color: "#d32f2f",
    marginTop: "1rem",
    textAlign: "center" as const,
  },
};
