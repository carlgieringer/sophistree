import React from "react";
import { Dialog, Button } from "react-native-paper";

const ConfirmationDialog = ({
  visible,
  onDismiss,
  onConfirm,
  title,
  message,
}: {
  visible: boolean;
  onDismiss: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}) => {
  return (
    <Dialog visible={visible} onDismiss={onDismiss}>
      <Dialog.Title>{title}</Dialog.Title>
      <Dialog.Content>{message}</Dialog.Content>
      <Dialog.Actions>
        <Button onPress={onDismiss}>Cancel</Button>
        <Button onPress={onConfirm}>Delete</Button>
      </Dialog.Actions>
    </Dialog>
  );
};

export default ConfirmationDialog;
