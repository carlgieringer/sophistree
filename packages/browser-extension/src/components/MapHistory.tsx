import React from "react";
import { StyleProp, View, ViewStyle } from "react-native";
import { DataTable, Text, Tooltip } from "react-native-paper";

import { ArgumentMapHistoryChange } from "@sophistree/common";

import { useActiveMapHistory } from "../sync/hooks";
import { BulletedList } from "@sophistree/ui-common";

const MapHistory: React.FC<{ style?: StyleProp<ViewStyle> }> = ({ style }) => {
  const history = useActiveMapHistory();

  return (
    <View style={style}>
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
              <BulletedList items={entry.changes.map(formatHistoryChange)} />
            </DataTable.Cell>
          </DataTable.Row>
        ))}
      </DataTable>
    </View>
  );
};

function formatHistoryChange(
  change: ArgumentMapHistoryChange,
): React.ReactNode {
  switch (change.type) {
    case "CreateMap":
      return `Created map “${change.name}”`;
    case "RenameMap":
      return `Renamed map to “${change.newName}” (was “${change.oldName}”)`;
    case "StartRemoteSync":
      return (
        <View>
          <Text>Started syncing remotely with sync servers:</Text>
          <BulletedList items={change.syncServerAddresses} />
        </View>
      );
    case "EndRemoteSync":
      return "Stopped syncing remotely";
    case "AddProposition":
      return `Added proposition: “${change.text}”`;
    case "ModifyProposition":
      return `Modified proposition to “${change.after.text}” (was “${change.before.text}”)`;
    case "RemoveProposition":
      return `Removed proposition: “${change.text}”`;
    case "AddMediaExcerpt":
      return (
        <Text>
          Added excerpt: “{change.quotation}” from{" "}
          <Tooltip title={change.url}>
            <Text>{change.sourceName}</Text>
          </Tooltip>
        </Text>
      );
    case "ModifyMediaExcerpt":
      return `Modified excerpt “${change.before.sourceName}” (was “${change.after.sourceName}”)`;
    case "RemoveMediaExcerpt":
      return (
        <Text>
          Removed excerpt: “{change.quotation}” from{" "}
          <Tooltip title={change.url}>
            <Text>{change.sourceName}</Text>
          </Tooltip>
        </Text>
      );
    case "AddJustification":
      return `Added ${change.polarity} justification`;
    case "ModifyJustification":
      return `Modified justification polarity to ${change.after.polarity} from ${change.before.polarity}`;
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
