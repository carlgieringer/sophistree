import React from "react";
import { useSelector } from "react-redux";
import { DataTable } from "react-native-paper";
import { StyleProp, ViewStyle } from "react-native";

import { RootState } from "../store";
import { Entity } from "../store/entitiesSlice";
import VisibilityDropdown from "./VisibilityDropdown";
import { activeMapEntities } from "../store/selectors";

const tableEntityTypes = new Set(["Proposition", "MediaExcerpt"]);

function EntityList({ style }: { style?: StyleProp<ViewStyle> }) {
  const allEntities = useSelector(activeMapEntities);
  const tableEntities = allEntities.filter((e) => tableEntityTypes.has(e.type));

  return (
    <DataTable style={style}>
      <DataTable.Header>
        <DataTable.Title>Type</DataTable.Title>
        <DataTable.Title>Description</DataTable.Title>
        <DataTable.Title>Visibility</DataTable.Title>
      </DataTable.Header>
      {tableEntities.map((entity) => (
        <DataTable.Row key={entity.id}>
          <DataTable.Cell>{entity.type}</DataTable.Cell>
          <DataTable.Cell>{makeDescription(entity)}</DataTable.Cell>
          <DataTable.Cell>
            <VisibilityDropdown entity={entity} />
          </DataTable.Cell>
        </DataTable.Row>
      ))}
    </DataTable>
  );
}

function makeDescription(entity: Entity): string {
  switch (entity.type) {
    case "Proposition":
      return entity.text;
    case "MediaExcerpt":
      return `“${entity.quotation}” ${entity.sourceName} <${entity.canonicalUrl}>`;
    default:
      return `${entity.type}`;
  }
}

export default EntityList;
