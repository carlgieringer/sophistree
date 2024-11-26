import React, { useState } from "react";
import { Dialog, Button } from "react-native-paper";
import { useDispatch } from "react-redux";

import { ArgumentMap } from "@sophistree/common";

import { createMap } from "../store/entitiesSlice";
import { sophistreeMapFileVersion } from "./DownloadMapsDialog";
import { MapMigrationIndex, migrateMap } from "../store/migrations";

type SophistreeMapFileContents = {
  sophistreeMapFileVersion: number;
  maps: ArgumentMap[];
};

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
      const jsonContent = JSON.parse(fileContent) as SophistreeMapFileContents;
      if (!("sophistreeMapFileVersion" in jsonContent)) {
        alert("Invalid file format");
        return;
      }

      const updatedMaps = jsonContent.maps.map((map: ArgumentMap) => {
        let updatedMap = map;
        for (
          let i = jsonContent.sophistreeMapFileVersion;
          i < sophistreeMapFileVersion;
          i++
        ) {
          updatedMap = migrateMap(
            updatedMap,
            i as MapMigrationIndex,
          ) as unknown as ArgumentMap;
        }
        return updatedMap;
      });
      updatedMaps.forEach((map: ArgumentMap) => {
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
        <Button onPress={() => void handleUpload()} disabled={!file}>
          Upload
        </Button>
      </Dialog.Actions>
    </Dialog>
  );
};

export default UploadMapsDialog;
