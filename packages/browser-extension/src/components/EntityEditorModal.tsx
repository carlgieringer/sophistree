import React, { useEffect } from "react";
import { Modal, Portal } from "react-native-paper";
import { StyleSheet, View } from "react-native";
import { useAppDispatch, useAppSelector } from "../store";

import EntityEditor from "./EntityEditor";
import { selectEntityEditorEntityId } from "../store/uiSlice";
import { selectEntities } from "../store/entitiesSlice";

interface EntityEditorModalProps {
  visible: boolean;
  onDismiss: () => void;
}

const EntityEditorModal: React.FC<EntityEditorModalProps> = ({
  visible,
  onDismiss,
}) => {
  const dispatch = useAppDispatch();
  const entityId = useAppSelector(selectEntityEditorEntityId);

  useEffect(() => {
    if (entityId) {
      dispatch(selectEntities([entityId]));
    }
  }, [dispatch, entityId]);

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modalContent}
      >
        <View style={styles.container}>
          <EntityEditor />
        </View>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modalContent: {
    backgroundColor: "white",
    padding: 20,
    margin: 20,
    borderRadius: 4,
  },
  container: {
    minWidth: 300,
  },
});

export default EntityEditorModal;
