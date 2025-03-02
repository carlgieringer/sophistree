import React from "react";
import { View } from "react-native";
import { DataTable, Text } from "react-native-paper";
import { useActiveMap } from "../sync/hooks";
import { formatHistory } from "../sync/history";
import type { HistoryChange, HistoryEntry } from "../sync/history";

const MapHistory: React.FC = () => {
  const activeMap = useActiveMap();
  const history: HistoryEntry[] = activeMap ? formatHistory(activeMap) : [];

  return (
    <View>
      <DataTable>
        <DataTable.Header>
          <DataTable.Title>Time</DataTable.Title>
          <DataTable.Title>Change</DataTable.Title>
        </DataTable.Header>
        {history.map((entry, index) => (
          <DataTable.Row key={index}>
            <DataTable.Cell>
              {new Date(entry.timestamp).toLocaleString()}
            </DataTable.Cell>
            <DataTable.Cell>
              {entry.changes.map((change, changeIndex) => (
                <Text key={changeIndex}>
                  {formatHistoryChange(change)}
                  {changeIndex < entry.changes.length - 1 ? "\n" : ""}
                </Text>
              ))}
            </DataTable.Cell>
          </DataTable.Row>
        ))}
      </DataTable>
    </View>
  );
};

function formatHistoryChange(change: HistoryChange): string {
  switch (change.type) {
    case "CreateMap":
      return `Created map "${change.name}"`;
    case "RenameMap":
      return `Renamed map from "${change.before}" to "${change.after}"`;
    case "AddProposition":
      return `Added proposition: "${change.text}"`;
    case "ModifyProposition":
      return `Modified proposition from "${change.before}" to "${change.after}"`;
    case "RemoveProposition":
      return `Removed proposition: "${change.text}"`;
    case "AddMediaExcerpt":
      return `Added excerpt: "${change.quotation}" from ${change.sourceName}`;
    case "ModifyMediaExcerpt":
      return `Modified excerpt from "${change.before.quotation}" to "${change.after.quotation}"`;
    case "RemoveMediaExcerpt":
      return `Removed excerpt: "${change.quotation}"`;
    case "AddJustification":
      return `Added ${change.polarity} justification`;
    case "ModifyJustification":
      return `Modified justification polarity from ${change.before.polarity} to ${change.after.polarity}`;
    case "RemoveJustification":
      return `Removed justification`;
    case "AddAppearance":
      return `Added appearance`;
    case "ModifyAppearance":
      return `Modified appearance`;
    case "RemoveAppearance":
      return `Removed appearance`;
    case "AddPropositionCompoundAtom":
      return `Added proposition to compound`;
    default:
      return "Unknown change";
  }
}

export default MapHistory;
