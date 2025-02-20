import { View } from "react-native";
import { Text } from "react-native-paper";

interface BulletedListProps {
  items: string[];
  style?: object;
}

export function BulletedList({ items, style = {} }: BulletedListProps) {
  return (
    <View style={style}>
      {items.map((item, index) => (
        <View
          key={index}
          style={{
            flexDirection: "row",
            marginBottom: 8,
            flexWrap: "wrap",
          }}
        >
          <Text style={{ marginRight: 8, userSelect: "none" }}>•</Text>
          <Text style={{ flex: 1 }}>{item}</Text>
        </View>
      ))}
    </View>
  );
}
