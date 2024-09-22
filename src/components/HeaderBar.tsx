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

function HeaderBar({ id }: { id?: string }) {
  const dispatch = useDispatch();

  const [isMenuVisible, setMenuVisible] = useState(false);
  const hideMenu = () => setMenuVisible(false);
  const showMenu = () => setMenuVisible(true);

  const [isNewMapDialogVisible, setNewMapDialogVisible] = React.useState(false);
  const [isActivateMapDialogVisible, setActivateMapDialogVisible] =
    React.useState(false);

  const [isDownloadMapsDialogVisible, setDownloadMapsDialogVisible] =
    useState(false);

  const [isUploadMapsDialogVisible, setUploadMapsDialogVisible] =
    useState(false);

  const activeMapId = useSelector(selectors.activeMapId);
  const activeMapName = useSelector(selectors.activeMapName);

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
              setNewMapDialogVisible(true);
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
          <Menu.Item
            onPress={deleteActiveMap}
            title={`Delete ${activeMapName}`}
            disabled={!activeMapId}
          />
          <Menu.Item onPress={handleReload} title="Reload extension" />
        </Menu>
      </Appbar.Header>
      <Portal>
        <NewMapDialog
          visible={isNewMapDialogVisible}
          onDismiss={() => setNewMapDialogVisible(false)}
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
      </Portal>
    </>
  );
}

export default HeaderBar;
