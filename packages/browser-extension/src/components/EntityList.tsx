import React, { useState, useMemo } from "react";
import { DataTable, Searchbar } from "react-native-paper";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { View } from "react-native";

import { Entity, preferredUrl } from "@sophistree/common";

import VisibilityDropdown from "./VisibilityDropdown";

const tableEntityTypes = new Set(["Proposition", "MediaExcerpt"]);

function EntityList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchbar, setShowSearchbar] = useState(false);

  const allEntities = useMemo<Entity[]>(
    () => [
      {
        id: "1234",
        type: "Proposition",
        text: "Hi there",
        autoVisibility: "Visible",
      },
      {
        id: "1234",
        type: "Proposition",
        text: "Hi there",
        autoVisibility: "Visible",
      },
      {
        id: "1234",
        type: "Proposition",
        text: "Hi there",
        autoVisibility: "Visible",
      },
      {
        id: "1234",
        type: "Proposition",
        text: "Hi there",
        autoVisibility: "Visible",
      },
      {
        id: "1234",
        type: "Proposition",
        text: "Hi there",
        autoVisibility: "Visible",
      },
      {
        id: "1234",
        type: "Proposition",
        text: "Hi there",
        autoVisibility: "Visible",
      },
      {
        id: "1234",
        type: "Proposition",
        text: "Hi there",
        autoVisibility: "Visible",
      },
      {
        id: "1234",
        type: "Proposition",
        text: "Hi there",
        autoVisibility: "Visible",
      },
      {
        id: "1234",
        type: "Proposition",
        text: "Hi there",
        autoVisibility: "Visible",
      },
      {
        id: "1234",
        type: "Proposition",
        text: "Hi there",
        autoVisibility: "Visible",
      },
      {
        id: "1234",
        type: "Proposition",
        text: "Hi there",
        autoVisibility: "Visible",
      },
      {
        id: "1234",
        type: "Proposition",
        text: "Hi there",
        autoVisibility: "Visible",
      },
      {
        id: "1234",
        type: "Proposition",
        text: "Hi there",
        autoVisibility: "Visible",
      },
      {
        id: "1234",
        type: "Proposition",
        text: "Hi there",
        autoVisibility: "Visible",
      },
      {
        id: "1234",
        type: "Proposition",
        text: "Hi there",
        autoVisibility: "Visible",
      },
      {
        id: "1234",
        type: "Proposition",
        text: "Hi there",
        autoVisibility: "Visible",
      },
      {
        id: "1234",
        type: "Proposition",
        text: "Hi there",
        autoVisibility: "Visible",
      },
      {
        id: "1234",
        type: "Proposition",
        text: "Hi there",
        autoVisibility: "Visible",
      },
      {
        id: "1234",
        type: "Proposition",
        text: "Hi there",
        autoVisibility: "Visible",
      },
      {
        id: "1234",
        type: "Proposition",
        text: "Hi there",
        autoVisibility: "Visible",
      },
      {
        id: "1234",
        type: "Proposition",
        text: "Hi there",
        autoVisibility: "Visible",
      },
    ],
    [],
  );
  const selectedEntityIds = [] as string[];

  const filteredEntities = useMemo(() => {
    const tableEntities = allEntities.filter((e) =>
      tableEntityTypes.has(e.type),
    );
    if (!searchQuery) return tableEntities;
    return tableEntities.filter((entity) =>
      makeDescription(entity).toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [allEntities, searchQuery]);

  const toggleSearchbar = () => {
    setShowSearchbar(!showSearchbar);
    if (showSearchbar) {
      setSearchQuery("");
    }
  };

  return (
    <View>
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
    case "MediaExcerpt": {
      const url = preferredUrl(entity.urlInfo);
      return `"${entity.quotation}" ${entity.sourceInfo.name} <${url}>`;
    }
    default:
      return `${entity.type}`;
  }
}

export default EntityList;
