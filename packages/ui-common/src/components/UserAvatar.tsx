import { Avatar } from "react-native-paper";

export interface UserAvatarProps {
  id: string;
  displayName: string;
  pictureUrl?: string;
}

export function UserAvatar({ id, displayName, pictureUrl }: UserAvatarProps) {
  return pictureUrl ? (
    <Avatar.Image size={24} source={{ uri: pictureUrl }} />
  ) : (
    <Avatar.Text
      size={24}
      label={getInitials(displayName)}
      color={generateColor(id)}
    />
  );
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase())
    .join("")
    .slice(0, 2);
}

function generateColor(seed: string): string {
  // Create a simple hash from the name
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Convert hash to color
  const hue = Math.abs(hash % 360);
  // Use fixed saturation and lightness for good contrast and readability
  return `hsl(${hue}, 65%, 55%)`;
}
