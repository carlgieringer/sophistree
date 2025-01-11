import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { Button, Menu } from "react-native-paper";

import {
  AutoVisibility,
  EntityId,
  ExplicitVisibility,
} from "@sophistree/common";

import {
  automateEntityVisibility,
  hideEntity,
  showEntity,
} from "../store/entitiesSlice";

export default function VisibilityDropdown({
  entityId,
  explicitVisibility,
  autoVisibility,
}: {
  entityId: EntityId;
  explicitVisibility: ExplicitVisibility;
  autoVisibility: AutoVisibility;
}) {
  const dispatch = useDispatch();

  const [isMenuVisible, setMenuVisible] = useState(false);

  function showMenu() {
    setMenuVisible(true);
  }

  function hideMenu() {
    setMenuVisible(false);
  }

  function setVisible() {
    dispatch(showEntity(entityId));
    hideMenu();
  }

  function setHidden() {
    dispatch(hideEntity(entityId));
    hideMenu();
  }

  function unsetVisibility() {
    dispatch(automateEntityVisibility(entityId));
    hideMenu();
  }

  const visibilityText = explicitVisibility ?? `Auto (${autoVisibility})`;

  return (
    <Menu
      onDismiss={hideMenu}
      visible={isMenuVisible}
      anchor={<Button onPress={showMenu}>{visibilityText}</Button>}
    >
      <Menu.Item onPress={setVisible} title="Visible" />
      <Menu.Item onPress={setHidden} title="Hidden" />
      <Menu.Item onPress={unsetVisibility} title={`Auto (${autoVisibility})`} />
    </Menu>
  );
}
