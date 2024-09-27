import React, { useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { DataTable, Searchbar } from "react-native-paper";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { StyleProp, ViewStyle, View } from "react-native";

import { Entity, selectEntities } from "../store/entitiesSlice";
import VisibilityDropdown from "./VisibilityDropdown";
import * as selectors from "../store/selectors";

const tableEntityTypes = new Set(["Proposition", "MediaExcerpt"]);

function EntityList({ style }: { style?: StyleProp<ViewStyle> }) {
  const dispatch = useDispatch();
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchbar, setShowSearchbar] = useState(false);

  const allEntities = useSelector(selectors.activeMapEntities);
  const selectedEntityIds = useSelector(selectors.selectedEntityIds);

  const filteredEntities = useMemo(() => {
    const tableEntities = allEntities.filter((e) =>
      tableEntityTypes.has(e.type)
    );
    if (!searchQuery) return tableEntities;
    return tableEntities.filter((entity) =>
      makeDescription(entity).toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [allEntities, searchQuery]);

  const selectEntity = (id: string) => dispatch(selectEntities([id]));

  const toggleSearchbar = () => {
    setShowSearchbar(!showSearchbar);
    if (showSearchbar) {
      setSearchQuery("");
    }
  };

  return (
    <View style={style}>
      {showSearchbar && (
        <Searchbar
          placeholder="Search descriptions"
          placeholderTextColor="gray"
          onChangeText={setSearchQuery}
          value={searchQuery}
          mode="view"
          style={{ marginBottom: 10 }}
        />
      )}
      <DataTable>
        <DataTable.Header>
          <DataTable.Title>Type</DataTable.Title>
          <DataTable.Title onPress={toggleSearchbar}>
            Description
            <Icon name="filter" />
          </DataTable.Title>
          <DataTable.Title>Visibility</DataTable.Title>
        </DataTable.Header>
        {filteredEntities.map((entity) => (
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
    </View>
  );
}

function makeDescription(entity: Entity): string {
  switch (entity.type) {
    case "Proposition":
      return entity.text;
    case "MediaExcerpt":
      return `"${entity.quotation}" ${entity.sourceInfo.name} <${entity.urlInfo.canonicalUrl}>`;
    default:
      return `${entity.type}`;
  }
}

export default EntityList;
