import React, { useState } from "react";
import Icon from "react-native-vector-icons/MaterialIcons";
import { View } from "react-native";
import {
  Appbar,
  Divider,
  Menu,
  Portal,
  Snackbar,
  Text,
  Tooltip,
  useTheme,
} from "react-native-paper";
import { useSelector } from "react-redux";
import { useAppDispatch } from "../store";

import * as colors from "../colors";
import { deleteMap } from "../store/entitiesSlice";
import { syncMap } from "../store/apiSlice";
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

  const theme = useTheme();

  const [isSnackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarDuration, setSnackbarDuration] = useState(3000);
  const [snackbarIcon, setSnackbarIcon] = useState<
    "success" | "failure" | undefined
  >(undefined);

  const handleReload = () => {
    chrome.runtime.reload();
  };

  const handleOpenOptions = () => {
    chrome.runtime.openOptionsPage().catch((error) => {
      appLogger.error("Failed to open options page", error);
    });
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
        dispatch(syncMap())
          .unwrap()
          .then(
            () => {
              setSnackbarMessage("Successfully synced map");
              setSnackbarIcon("success");
              setSnackbarDuration(3_000);
              setSnackbarVisible(true);
            },
            (reason) => {
              setSnackbarMessage("Failed to sync map");
              setSnackbarIcon("failure");
              setSnackbarDuration(10_000);
              setSnackbarVisible(true);
              appLogger.error("Failed to sync map", reason);
            },
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
    [
      <Menu.Item
        title="Options"
        leadingIcon="cog"
        key="options"
        onPress={() => {
          handleOpenOptions();
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
        <Snackbar
          visible={isSnackbarVisible}
          onDismiss={() => setSnackbarVisible(false)}
          duration={snackbarDuration}
          action={{
            label: "Dismiss",
            onPress: () => setSnackbarVisible(false),
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {snackbarIcon === "success" && (
              <Icon name="check-circle-outline" color={colors.nephritis} />
            )}
            {snackbarIcon === "failure" && (
              <Icon name="error" color={colors.pomegranate} />
            )}
            <Text style={{ color: theme.colors.inverseOnSurface }}>
              {snackbarMessage}
            </Text>
          </View>
        </Snackbar>
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
