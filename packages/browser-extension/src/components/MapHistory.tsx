import React, { ReactElement } from "react";
import { StyleProp, View, ViewStyle, StyleSheet } from "react-native";
import { DataTable, Text, Tooltip } from "react-native-paper";
import { HistoryEntryAuthor } from "./HistoryEntryAuthor";

import {
  ArgumentMapHistoryChange,
  JustificationBasisHistoryInfo,
  JustificationTargetHistoryInfo,
  Polarity,
} from "@sophistree/common";
import { BulletedList } from "@sophistree/ui-common";

import { useActiveMapHistory } from "../sync/hooks";

const MapHistory: React.FC<{ style?: StyleProp<ViewStyle> }> = ({ style }) => {
  const history = useActiveMapHistory();

  return (
    <View style={style}>
      <DataTable>
        <DataTable.Header>
          <DataTable.Title>Time</DataTable.Title>
          <DataTable.Title>Author</DataTable.Title>
          <DataTable.Title>Change</DataTable.Title>
        </DataTable.Header>
        {history.map((entry, index) => (
          <DataTable.Row key={index}>
            <DataTable.Cell>
              {new Date(entry.timestamp).toLocaleString()}
            </DataTable.Cell>
            <DataTable.Cell style={styles.authorCell}>
              <HistoryEntryAuthor
                actorId={entry.actorId}
                userDisplayName={entry.userDisplayName}
              />
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

const styles = StyleSheet.create({
  authorCell: {
    overflow: "hidden",
  },
});

function formatHistoryChange(
  change: ArgumentMapHistoryChange,
): React.ReactNode {
  switch (change.type) {
    case "BeginHistory":
      return "Started tracking history";
    case "ResetHistory":
      return "Reset history";
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
          <Tooltip title={change.urlInfo.url}>
            <Text>{change.sourceInfo.name}</Text>
          </Tooltip>
        </Text>
      );
    case "ModifyMediaExcerpt":
      return `Modified excerpt “${change.before.sourceName}” (was “${change.after.sourceName}”)`;
    case "RemoveMediaExcerpt":
      return (
        <Text>
          Removed excerpt: “{change.quotation}” from{" "}
          <Tooltip title={change.urlInfo.url}>
            <Text>{change.sourceInfo.name}</Text>
          </Tooltip>
        </Text>
      );
    case "AddJustification": {
      const { description: targetDescription, summary: targetSummary } =
        fromTargetHistoryInfo(change.targetInfo);
      const { description: basisDescription, summary: basisSummary } =
        fromBasisHistoryInfo(change.basisInfo);
      return (
        <Text>
          Added justification {polarityPreposition(change.polarity)}{" "}
          <Tooltip title={targetDescription}>{targetSummary}</Tooltip> based on{" "}
          <Tooltip title={basisDescription}>{basisSummary}</Tooltip>
        </Text>
      );
    }
    case "ModifyJustification": {
      const { description: targetDescription, summary: targetSummary } =
        fromTargetHistoryInfo(change.targetInfo);
      const { description: basisDescription, summary: basisSummary } =
        fromBasisHistoryInfo(change.basisInfo);
      return (
        <Text>
          Modified polarity to {change.polarity} (was {change.oldPolarity}) for
          justification of{" "}
          <Tooltip title={targetDescription}>{targetSummary}</Tooltip> based on{" "}
          <Tooltip title={basisDescription}>{basisSummary}</Tooltip>
        </Text>
      );
    }
    case "RemoveJustification": {
      const { description: targetDescription, summary: targetSummary } =
        fromTargetHistoryInfo(change.targetInfo);
      const { description: basisDescription, summary: basisSummary } =
        fromBasisHistoryInfo(change.basisInfo);
      return (
        <Text>
          Removed justification ${polarityPreposition(change.polarity)}{" "}
          <Tooltip title={targetDescription}>{targetSummary}</Tooltip> based on{" "}
          <Tooltip title={basisDescription}>{basisSummary}</Tooltip>
        </Text>
      );
    }
    case "AddAppearance":
      return `Added appearance of “${change.apparitionInfo.text}” at “${change.mediaExcerpt.quotation}” from ${change.mediaExcerpt.sourceInfo.name}`;
    case "RemoveAppearance":
      return `Removed appearance of “${change.apparitionInfo.text}” at “${change.mediaExcerpt.quotation}” from ${change.mediaExcerpt.sourceInfo.name}`;
    case "ModifyPropositionCompoundAtoms":
      return (
        <View>
          <Text>Modified proposition compound atoms:</Text>
          <BulletedList
            items={change.atoms.map(({ id, text, modificationType }) => (
              <Text key={id}>
                {modificationType !== "Unchanged"
                  ? `[${modificationType}]`
                  : ""}{" "}
                {text}
              </Text>
            ))}
          />
        </View>
      );
  }
}

function fromTargetHistoryInfo(info: JustificationTargetHistoryInfo): {
  summary: ReactElement;
  description: string;
} {
  switch (info.type) {
    case "Proposition":
      return {
        summary: <Text>Proposition “{info.text}”</Text>,
        description: `Proposition ${info.text}`,
      };
    case "Justification": {
      const { summary: targetSummary, description: targetDescription } =
        fromTargetHistoryInfo(info.targetInfo);
      const { summary: basisSummary, description: basisDescription } =
        fromBasisHistoryInfo(info.basisInfo);
      return {
        summary: (
          <Text>
            Justification {polarityPreposition(info.polarity)} {targetSummary}{" "}
            based on {basisSummary}
          </Text>
        ),
        description: `Justification ${polarityPreposition(info.polarity)} ${targetDescription} based on ${basisDescription}`,
      };
    }
  }
}

function fromBasisHistoryInfo(info: JustificationBasisHistoryInfo): {
  summary: ReactElement;
  description: string;
} {
  switch (info.type) {
    case "MediaExcerpt":
      return {
        summary: (
          <Text>
            “{info.quotation}” from{" "}
            <Tooltip title={info.urlInfo.url}>
              <Text>{info.sourceInfo.name}</Text>
            </Tooltip>
          </Text>
        ),
        description: `“${info.quotation}” from ${info.sourceInfo.name}`,
      };
    case "PropositionCompound":
      return {
        summary: <BulletedList items={info.atoms.map((a) => a.text)} />,
        description: info.atoms.map((a) => `“${a.text}”`).join(", "),
      };
  }
}

function polarityPreposition(polarity: Polarity) {
  return polarity === "Positive" ? "for" : "against";
}

export default MapHistory;
