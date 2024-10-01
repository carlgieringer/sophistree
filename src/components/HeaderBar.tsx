import React, { useState } from "react";
import { Appbar, Divider, Menu, Portal } from "react-native-paper";
import { useDispatch, useSelector } from "react-redux";

import { RootState } from "../store";
import { deleteMap } from "../store/entitiesSlice";
import NewMapDialog from "./NewMapDialog";
import ActivateMapDialog from "./ActivateMapDialog";
import DownloadMapsDialog from "./DownloadMapsDialog";
import UploadMapsDialog from "./UploadMapsDialog";
import * as selectors from "../store/selectors";
import RenameMapDialog from "./RenameMapDialog";
import ConfirmationDialog from "./ConfirmationDialog";
import {
  hideNewMapDialog,
  selectIsNewMapDialogVisible,
  showNewMapDialog,
} from "../store/uiSlice";

function HeaderBar({ id }: { id?: string }) {
  const dispatch = useDispatch();

  const [isMenuVisible, setMenuVisible] = useState(false);
  const hideMenu = () => setMenuVisible(false);
  const showMenu = () => setMenuVisible(true);

  const [isRenameMapDialogVisible, setRenameMapDialogVisible] = useState(false);

  const isNewMapDialogVisible = useSelector(selectIsNewMapDialogVisible);
  const [isActivateMapDialogVisible, setActivateMapDialogVisible] =
    React.useState(false);

  const [isDownloadMapsDialogVisible, setDownloadMapsDialogVisible] =
    useState(false);

  const [isUploadMapsDialogVisible, setUploadMapsDialogVisible] =
    useState(false);

  const activeMapId = useSelector(selectors.activeMapId);
  const activeMapName = useSelector(selectors.activeMapName);

  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleReload = () => {
    chrome.runtime.reload();
  };

  function deleteActiveMap() {
    if (!activeMapId) {
      console.warn("No active map to delete");
      return;
    }
    dispatch(deleteMap(activeMapId));
  }

  const deleteDialog = (
    <ConfirmationDialog
      visible={isDeleteDialogOpen}
      onDismiss={() => setDeleteDialogOpen(false)}
      onConfirm={() => {
        deleteActiveMap();
        setDeleteDialogOpen(false);
      }}
      title="Delete Map"
      message={`Are you sure you want to delete the map "${activeMapName}"? This action cannot be undone.`}
    />
  );

  return (
    <>
      <Appbar.Header id={id}>
        <Appbar.Content title={activeMapName} />
        <Menu
          onDismiss={hideMenu}
          visible={isMenuVisible}
          anchor={<Appbar.Action icon="dots-vertical" onPress={showMenu} />}
        >
          <Menu.Item
            title="Rename map…"
            leadingIcon="pencil"
            key="rename-map"
            onPress={() => {
              setRenameMapDialogVisible(true);
              hideMenu();
            }}
            disabled={!activeMapId}
          />
          <Menu.Item
            key="delete-map"
            onPress={() => {
              setDeleteDialogOpen(true);
              hideMenu();
            }}
            leadingIcon="delete"
            title={`Delete ${activeMapName}`}
            disabled={!activeMapId}
          />
          <Divider />
          <Menu.Item
            title="Open map…"
            leadingIcon="folder-open"
            key="open-map"
            onPress={() => {
              setActivateMapDialogVisible(true);
              hideMenu();
            }}
          />
          <Menu.Item
            title="Create new map…"
            leadingIcon="plus"
            key="create-new-map"
            onPress={() => {
              dispatch(showNewMapDialog());
              hideMenu();
            }}
          />
          <Divider />
          <Menu.Item
            title="Download maps…"
            leadingIcon="download"
            key="download-maps"
            onPress={() => {
              setDownloadMapsDialogVisible(true);
              hideMenu();
            }}
          />
          <Menu.Item
            title="Import maps"
            leadingIcon="upload"
            key="import-maps"
            onPress={() => {
              setUploadMapsDialogVisible(true);
              hideMenu();
            }}
          />
          <Divider />
          <Menu.Item onPress={handleReload} title="Reload extension" />
        </Menu>
      </Appbar.Header>
      <Portal>
        {activeMapName && (
          <RenameMapDialog
            mapName={activeMapName}
            visible={isRenameMapDialogVisible}
            onDismiss={() => setRenameMapDialogVisible(false)}
          />
        )}
        <NewMapDialog
          visible={isNewMapDialogVisible}
          onDismiss={() => dispatch(hideNewMapDialog())}
        />
        <ActivateMapDialog
          visible={isActivateMapDialogVisible}
          onDismiss={() => setActivateMapDialogVisible(false)}
        />
        <DownloadMapsDialog
          visible={isDownloadMapsDialogVisible}
          onDismiss={() => setDownloadMapsDialogVisible(false)}
        />
        <UploadMapsDialog
          visible={isUploadMapsDialogVisible}
          onDismiss={() => setUploadMapsDialogVisible(false)}
        />
        {deleteDialog}
      </Portal>
    </>
  );
}

export default HeaderBar;
