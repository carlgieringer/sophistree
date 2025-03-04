import React, { useState } from "react";
import Icon from "react-native-vector-icons/MaterialIcons";
import { View } from "react-native";
import {
  Appbar,
  Divider,
  Menu,
  Snackbar,
  Text,
  Tooltip,
  useTheme,
} from "react-native-paper";
import { useSelector } from "react-redux";
import { useAppDispatch } from "../store";

import * as colors from "../colors";
import {
  deleteMap,
  syncActiveMapLocally,
  syncActiveMapRemotely,
  useActiveMapAutomergeDocumentId,
} from "../store/entitiesSlice";
import { publishMap as publishMap } from "../store/apiSlice";
import NewMapDialog from "./NewMapDialog";
import ActivateMapDialog from "./ActivateMapDialog";
import DownloadMapsDialog from "./DownloadMapsDialog";
import UploadMapsDialog from "./UploadMapsDialog";
import RenameMapDialog from "./RenameMapDialog";
import ConfirmationDialog from "./ConfirmationDialog";
import {
  hideNewMapDialog,
  selectIsNewMapDialogVisible,
  showNewMapDialog,
} from "../store/uiSlice";
import * as appLogger from "../logging/appLogging";
import { useActiveMapName } from "../sync/hooks";
import { useIsAuthenticated } from "../store/authSlice";
import { isRemote } from "../sync";
import { useDefaultSyncServerAddresses } from "../sync/defaultSyncServerAddresses";

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

  const activeMapDocumentId = useActiveMapAutomergeDocumentId();
  const activeMapName = useActiveMapName();
  const isAuthenticated = useIsAuthenticated();
  const { addresses: defaultSyncServerAddresses } =
    useDefaultSyncServerAddresses();

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
    if (!activeMapDocumentId) {
      appLogger.warn("No active map to delete");
      return;
    }
    dispatch(deleteMap(activeMapDocumentId));
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

  const publishMenuItem = (
    <Menu.Item
      title="Publish map"
      key="publish-map"
      onPress={() => {
        dispatch(publishMap())
          .unwrap()
          .then(
            () => {
              setSnackbarMessage("Successfully published map");
              setSnackbarIcon("success");
              setSnackbarDuration(3_000);
              setSnackbarVisible(true);
            },
            (reason) => {
              setSnackbarMessage("Failed to publish map");
              setSnackbarIcon("failure");
              setSnackbarDuration(10_000);
              setSnackbarVisible(true);
              appLogger.error("Failed to publish map", reason);
            },
          );
        hideMenu();
      }}
      leadingIcon="cloud-upload"
      disabled={!activeMapDocumentId || !isAuthenticated}
    />
  );
  const syncMenuItem = !activeMapDocumentId ? null : isRemote(
      activeMapDocumentId,
    ) ? (
    <Menu.Item
      title="Sync locally"
      leadingIcon="sync"
      key="sync-map-locally"
      onPress={() => {
        dispatch(syncActiveMapLocally());
        hideMenu();
      }}
    />
  ) : (
    <Menu.Item
      title="Sync remotely"
      leadingIcon="sync"
      key="sync-map-remotely"
      onPress={() => {
        if (!defaultSyncServerAddresses.length) {
          setSnackbarMessage("No sync server addresses configured");
          setSnackbarIcon("failure");
          setSnackbarDuration(10_000);
          setSnackbarVisible(true);
          hideMenu();
          return;
        }
        dispatch(syncActiveMapRemotely(defaultSyncServerAddresses));
        hideMenu();
      }}
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
        disabled={!activeMapDocumentId}
      />,
      syncMenuItem,
      activeMapDocumentId && isRemote(activeMapDocumentId) && (
        <Menu.Item
          title="Copy document ID"
          leadingIcon="content-copy"
          key="copy-id"
          onPress={() => {
            void navigator.clipboard.writeText(activeMapDocumentId).then(
              () => {
                setSnackbarMessage("Document ID copied to clipboard");
                setSnackbarIcon("success");
                setSnackbarDuration(3000);
                setSnackbarVisible(true);
              },
              (reason) => {
                setSnackbarMessage("Failed to copy to clipboard");
                setSnackbarIcon("failure");
                setSnackbarDuration(10_000);
                setSnackbarVisible(true);
                appLogger.error(
                  "Failed to copy document ID to clipboard",
                  reason,
                );
              },
            );
            hideMenu();
          }}
        />
      ),
      isAuthenticated ? (
        publishMenuItem
      ) : (
        <Tooltip
          title="You must be logged in to publish maps"
          key="publish-map"
        >
          {publishMenuItem}
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
        disabled={!activeMapDocumentId}
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
    </>
  );
}

export default HeaderBar;
