import { View } from "react-native";
import { Text } from "react-native-paper";
import React from "react";

interface BulletedListProps {
  items: React.ReactNode[];
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
          <View style={{ flex: 1 }}>
            {typeof item === "string" ? <Text>{item}</Text> : item}
          </View>
        </View>
      ))}
    </View>
  );
}
