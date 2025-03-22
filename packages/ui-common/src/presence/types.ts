import { Position } from "cytoscape";

export interface UserPresence {
  actorId: string;
  userDisplayName?: string;
  cursorPosition?: Position;
  selection?: string[]; // Entity IDs
  presenceTimestampEpochMs: number;
}

export interface CollaborativePresenceState {
  presenceByActorId: Record<string, UserPresence>;
}

// Configuration constants
export const CURSOR_HIDE_TIMEOUT_MS = 5000; // Hide cursor after 5s of inactivity
export const PRESENCE_BROADCAST_INTERVAL_MS = 30000; // Broadcast presence every 30s
export const DISPLAY_NAME_SHOW_TIMEOUT_MS = 2000; // Show display name for 2s
export const DISPLAY_NAME_FADE_DURATION_MS = 1000; // Fade duration of 1s
