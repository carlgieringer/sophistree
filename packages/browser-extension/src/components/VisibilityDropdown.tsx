import React from "react";
import { useDispatch } from "react-redux";
import {
  automateEntityVisibility,
  Entity,
  hideEntity,
  showEntity,
} from "../store/entitiesSlice";
import { Button, Menu } from "react-native-paper";
import { useState } from "react";

export default function VisibilityDropdown({ entity }: { entity: Entity }) {
  const dispatch = useDispatch();

  const [isMenuVisible, setMenuVisible] = useState(false);

  function showMenu() {
    setMenuVisible(true);
  }

  function hideMenu() {
    setMenuVisible(false);
  }

  function setVisible() {
    dispatch(showEntity(entity.id));
    hideMenu();
  }

  function setHidden() {
    dispatch(hideEntity(entity.id));
    hideMenu();
  }

  function unsetVisibility() {
    dispatch(automateEntityVisibility(entity.id));
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
