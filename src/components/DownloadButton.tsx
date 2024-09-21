import React from "react";
import { Button, Menu } from "react-native-paper";

export default function DownloadButton() {
  const [visible, setVisible] = React.useState(false);
  const openMenu = () => setVisible(true);
  const closeMenu = () => setVisible(false);

  return (
    <Menu
      visible={visible}
      onDismiss={closeMenu}
      anchor={<Button onPress={openMenu}>Download…</Button>}
    >
      <Menu.Item title="Download current map" onPress={() => {}} />
      <Menu.Item title="Download all maps" onPress={() => {}} />
    </Menu>
  );
}
