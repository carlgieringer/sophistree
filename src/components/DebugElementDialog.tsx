import React from "react";
import { EdgeDataDefinition, NodeDataDefinition } from "cytoscape";
import { Dialog, Text } from "react-native-paper";

interface DebugElementDialogProps {
  visible: boolean;
  onDismiss: () => void;
  data: NodeDataDefinition | EdgeDataDefinition;
}

const DebugElementDialog: React.FC<DebugElementDialogProps> = ({
  visible,
  onDismiss,
  data,
}) => {
  return (
    <Dialog visible={visible} onDismiss={onDismiss}>
      <Dialog.Title>Debug Element Data</Dialog.Title>
      <Dialog.Content>
        <Text style={{ fontFamily: "monospace" }}>
          {JSON.stringify(data, null, 2)}
        </Text>
      </Dialog.Content>
    </Dialog>
  );
};

export default DebugElementDialog;
