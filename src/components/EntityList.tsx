import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { DataTable } from "react-native-paper";
import { StyleProp, ViewStyle } from "react-native";

import { Entity, selectEntities } from "../store/entitiesSlice";
import VisibilityDropdown from "./VisibilityDropdown";
import * as selectors from "../store/selectors";

const tableEntityTypes = new Set(["Proposition", "MediaExcerpt"]);

function EntityList({ style }: { style?: StyleProp<ViewStyle> }) {
  const dispatch = useDispatch();

  const allEntities = useSelector(selectors.activeMapEntities);
  const tableEntities = allEntities.filter((e) => tableEntityTypes.has(e.type));
  const selectedEntityIds = useSelector(selectors.selectedEntityIds);

  const selectEntity = (id: string) => dispatch(selectEntities([id]));

  return (
    <DataTable style={style}>
      <DataTable.Header>
        <DataTable.Title>Type</DataTable.Title>
        <DataTable.Title>Description</DataTable.Title>
        <DataTable.Title>Visibility</DataTable.Title>
      </DataTable.Header>
      {tableEntities.map((entity) => (
        <DataTable.Row
          key={entity.id}
          style={
            selectedEntityIds.includes(entity.id)
              ? { backgroundColor: "lightblue" }
              : undefined
          }
          onPress={() => selectEntity(entity.id)}
        >
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
