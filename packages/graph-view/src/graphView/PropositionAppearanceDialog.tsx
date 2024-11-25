import { StyleSheet, View } from "react-native";
import { Dialog, Button, Text, Tooltip, Divider } from "react-native-paper";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

import { MediaExcerpt, preferredUrl } from "@sophistree/common";
import { PropositionNodeData } from "./graphTypes";

export interface OnFocusMediaExcerpt {
  (mediaExcerpt: MediaExcerpt): void;
}

export interface OnDeleteEntity {
  (id: string): void;
}

export default function PropositionAppearanceDialog({
  data,
  visible,
  onDismiss,
  onFocusMediaExcerpt,
  onDeleteEntity,
}: {
  data: PropositionNodeData;
  visible: boolean;
  onDismiss: () => void;
  onFocusMediaExcerpt: OnFocusMediaExcerpt;
  onDeleteEntity: OnDeleteEntity;
}) {
  return (
    <Dialog visible={visible} onDismiss={onDismiss}>
      <Dialog.Title>Appearances for “{data.entity.text}”</Dialog.Title>
      <Dialog.Content>
        {data.appearances?.map((appearance, i) => {
          const url = preferredUrl(appearance.mediaExcerpt.urlInfo);
          const hostname = new URL(url).hostname;
          return (
            <>
              {i > 0 ? <Divider style={styles.divider} /> : null}
              <View>
                <Text>“{appearance.mediaExcerpt.quotation}”</Text>
                <Text style={styles.sourceName}>
                  {appearance.mediaExcerpt.sourceInfo.name}{" "}
                </Text>
                <Tooltip title={url}>
                  <Text style={styles.hostname}>{hostname}</Text>
                </Tooltip>
                <View key={appearance.id} style={styles.row}>
                  <Button
                    style={styles.goButtonCell}
                    onPress={() => onFocusMediaExcerpt(appearance.mediaExcerpt)}
                  >
                    Go
                  </Button>
                  {onDeleteEntity && (
                    <Button
                      style={styles.deleteButtonCell}
                      accessibilityLabel="delete appearance"
                      onPress={() => onDeleteEntity(appearance.id)}
                    >
                      <Icon name="delete" size={18} />
                    </Button>
                  )}
                </View>
              </View>
            </>
          );
        })}
      </Dialog.Content>
      <Dialog.Actions>
        <Button onPress={onDismiss}>Close</Button>
      </Dialog.Actions>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  sourceName: {
    fontWeight: "bold",
  },
  hostname: {
    fontWeight: "bold",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  goButtonCell: {
    flex: 1,
  },
  deleteButtonCell: {
    flexShrink: 0,
    marginLeft: 10,
  },
  divider: {
    marginBottom: 20,
  },
});
