import React, { useState } from "react";
import { Appbar, Divider, Menu, Portal, Tooltip } from "react-native-paper";
import { useSelector } from "react-redux";
import { useAppDispatch } from "../store/store";

import { deleteMap, syncMap } from "../store/entitiesSlice";
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
import * as appLogger from "../logging/appLogging";

function HeaderBar({ id }: { id?: string }) {
  const dispatch = useAppDispatch();

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
  const isAuthenticated = useSelector(selectors.isAuthenticated);

  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleReload = () => {
    chrome.runtime.reload();
  };

  function deleteActiveMap() {
    if (!activeMapId) {
      appLogger.warn("No active map to delete");
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

  const syncMenuItem = (
    <Menu.Item
      title="Sync map"
      key="sync-map"
      onPress={() => {
        dispatch(syncMap()).catch((reason) =>
          appLogger.error("Failed to sync map", reason),
        );
        hideMenu();
      }}
      leadingIcon="cloud-upload"
      disabled={!activeMapId || !isAuthenticated}
    />
  );

  const menuItemGroups = [
    [
      <Menu.Item
        title="Rename map…"
        leadingIcon="pencil"
        key="rename-map"
        onPress={() => {
          setRenameMapDialogVisible(true);
          hideMenu();
        }}
        disabled={!activeMapId}
      />,
      isAuthenticated ? (
        syncMenuItem
      ) : (
        <Tooltip title="You must be logged in to sync maps" key="sync-map">
          {syncMenuItem}
        </Tooltip>
      ),
      <Menu.Item
        key="delete-map"
        onPress={() => {
          setDeleteDialogOpen(true);
          hideMenu();
        }}
        leadingIcon="delete"
        title={`Delete ${activeMapName}`}
        disabled={!activeMapId}
      />,
    ],
    [
      <Menu.Item
        title="Open map…"
        leadingIcon="folder-open"
        key="open-map"
        onPress={() => {
          setActivateMapDialogVisible(true);
          hideMenu();
        }}
      />,
      <Menu.Item
        title="Create new map…"
        leadingIcon="plus"
        key="create-new-map"
        onPress={() => {
          dispatch(showNewMapDialog());
          hideMenu();
        }}
      />,
    ],
    [
      <Menu.Item
        title="Download maps…"
        leadingIcon="download"
        key="download-maps"
        onPress={() => {
          setDownloadMapsDialogVisible(true);
          hideMenu();
        }}
      />,
      <Menu.Item
        title="Import maps"
        leadingIcon="upload"
        key="import-maps"
        onPress={() => {
          setUploadMapsDialogVisible(true);
          hideMenu();
        }}
      />,
    ],
  ];
  if (process.env.NODE_ENV === "development") {
    menuItemGroups.push([
      <Menu.Item
        key="reload-extension"
        onPress={handleReload}
        title="Reload extension"
      />,
    ]);
  }
  const menuItems = menuItemGroups.flatMap((group, index) => [
    ...(index > 0 ? [<Divider key={`divider-${index}`} />] : []),
    ...group,
  ]);

  return (
    <>
      <Appbar.Header id={id}>
        <Appbar.Content title={activeMapName} />
        <Menu
          onDismiss={hideMenu}
          visible={isMenuVisible}
          anchor={<Appbar.Action icon="dots-vertical" onPress={showMenu} />}
        >
          {menuItems}
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
