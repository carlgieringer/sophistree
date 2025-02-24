import React from "react";

import { Entity } from "@sophistree/common";

import {
  automateEntityVisibility,
  hideEntity,
  showEntity,
} from "../store/entitiesSlice";
import { Button, Menu } from "react-native-paper";
import { useState } from "react";
import { useAppDispatch } from "../store";
import * as appLogger from "../logging/appLogging";

export default function VisibilityDropdown({ entity }: { entity: Entity }) {
  const dispatch = useAppDispatch();

  const [isMenuVisible, setMenuVisible] = useState(false);

  function showMenu() {
    setMenuVisible(true);
  }

  function hideMenu() {
    setMenuVisible(false);
  }

  function setVisible() {
    dispatch(showEntity(entity.id))
      .unwrap()
      .catch((reason) => appLogger.error("Failed to show entity", reason));
    hideMenu();
  }

  function setHidden() {
    dispatch(hideEntity(entity.id))
      .unwrap()
      .catch((reason) => appLogger.error("Failed to hide entity", reason));
    hideMenu();
  }

  function unsetVisibility() {
    dispatch(automateEntityVisibility(entity.id))
      .unwrap()
      .catch((reason) =>
        appLogger.error("Failed to automate entity visibility", reason),
      );
    hideMenu();
  }

  const visibilityText =
    entity.explicitVisibility ?? `Auto (${entity.autoVisibility})`;

  return (
    <Menu
      onDismiss={hideMenu}
      visible={isMenuVisible}
      anchor={<Button onPress={showMenu}>{visibilityText}</Button>}
    >
      <Menu.Item onPress={setVisible} title="Visible" />
      <Menu.Item onPress={setHidden} title="Hidden" />
      <Menu.Item
        onPress={unsetVisibility}
        title={`Auto (${entity.autoVisibility})`}
      />
    </Menu>
  );
}
