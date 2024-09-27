import React, { useState } from "react";
import { Dialog, Button, Portal } from "react-native-paper";
import { useDispatch } from "react-redux";
import { createMap } from "../store/entitiesSlice";
import { sophistreeMapFileVersion } from "./DownloadMapsDialog";
import { migrateMap } from "../store/migrations";

const UploadMapsDialog = ({
  onDismiss,
  visible,
}: {
  onDismiss?: () => void;
  visible: boolean;
}) => {
  const dispatch = useDispatch();

  const [file, setFile] = useState<File | null>(null);

  function handleClose() {
    if (onDismiss) {
      onDismiss();
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFile(event.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (file) {
      const fileContent = await file.text();
      const jsonContent = JSON.parse(fileContent);
      if (!jsonContent.sophistreeMapFileVersion) {
        alert("Invalid file format");
        return;
      }

      const maps = jsonContent.maps || [jsonContent.map];
      const updatedMaps = maps.map((map: any) => {
        let updatedMap = map;
        for (
          let i = jsonContent.sophistreeMapFileVersion;
          i < sophistreeMapFileVersion;
          i++
        ) {
          updatedMap = migrateMap(updatedMap, i);
        }
        return updatedMap;
      });
      updatedMaps.forEach((map: any) => {
        dispatch(createMap(map));
      });
    }
    handleClose();
  };

  return (
    <Dialog visible={visible} onDismiss={handleClose}>
      <Dialog.Title>Upload File</Dialog.Title>
      <Dialog.Content>
        <input type="file" onChange={handleFileChange} />
      </Dialog.Content>
      <Dialog.Actions>
        <Button onPress={handleClose}>Cancel</Button>
        <Button onPress={handleUpload} disabled={!file}>
          Upload
        </Button>
      </Dialog.Actions>
    </Dialog>
  );
};

export default UploadMapsDialog;
