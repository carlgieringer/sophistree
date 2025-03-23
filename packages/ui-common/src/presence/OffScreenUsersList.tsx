import { Position } from "cytoscape";

import { CollaborativePresenceState } from "./types";

import "./OffScreenUsersList.scss";

interface OffScreenUsersListProps {
  presenceState: CollaborativePresenceState;
  viewport: { x1: number; y1: number; x2: number; y2: number } | undefined;
  onNavigateToUser: (actorId: string) => void;
}

function isPositionInViewport(
  position: Position,
  viewport: { x1: number; y1: number; x2: number; y2: number } | undefined,
): boolean {
  if (!viewport) return true;
  return (
    position.x >= viewport.x1 &&
    position.x <= viewport.x2 &&
    position.y >= viewport.y1 &&
    position.y <= viewport.y2
  );
}

export default function OffScreenUsersList({
  presenceState,
  viewport,
  onNavigateToUser,
}: OffScreenUsersListProps) {
  // Filter users whose cursors are off-screen and active
  const offScreenUsers = Object.entries(presenceState.presenceByActorId)
    .filter(([, presence]) => {
      // Check if user has an active cursor
      if (!presence.cursorPosition) return false;

      // Check if cursor is outside viewport
      return !isPositionInViewport(presence.cursorPosition, viewport);
    })
    .map(([actorId, presence]) => ({
      actorId,
      // Get display name from map's userInfoByActorId
      displayName: presence.userDisplayName || "Unknown User",
    }));

  if (offScreenUsers.length === 0) return null;

  return (
    <div className="off-screen-users-list">
      <h4>Off-screen users</h4>
      <ul>
        {offScreenUsers.map((user) => (
          <li
            key={user.actorId}
            onClick={() => onNavigateToUser(user.actorId)}
            className="off-screen-user"
          >
            <span className="user-name">{user.displayName}</span>
            <span className="click-hint">Click to navigate</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
