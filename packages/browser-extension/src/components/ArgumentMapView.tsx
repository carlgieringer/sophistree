import React, { ReactNode, useMemo } from "react";
import { View } from "react-native";
import {
  Card,
  Title,
  Paragraph,
  List,
  Divider,
  Text,
  Tooltip,
  Chip,
} from "react-native-paper";
import { useSelector } from "react-redux";

import { ArgumentMap } from "@sophistree/common";

import * as selectors from "../store/selectors";

const ArgumentMapView = ({
  map,
  titleButton,
  isActive,
}: {
  map: ArgumentMap;
  titleButton: ReactNode;
  isActive: boolean;
}) => {
  const allPropositions = useSelector(selectors.allPropositions);

  const propositionTextById = useMemo(() => {
    const neededIds = new Set(map.conclusions.flatMap((c) => c.propositionIds));
    return Object.fromEntries(
      allPropositions
        .filter((prop) => neededIds.has(prop.id))
        .map((prop) => [prop.id, prop.text]),
    );
  }, [map.conclusions, allPropositions]);
  return (
    <Card style={{ marginTop: 16 }}>
      <Card.Content>
        <Title>
          {map.name} {titleButton} {isActive && <Chip>Active</Chip>}
        </Title>
        <Paragraph>Entities: {map.entities.length}</Paragraph>
        <Text variant="titleMedium" style={{ marginTop: 20, marginBottom: 10 }}>
          Conclusions
        </Text>
        {map.conclusions.map((conclusion, index) => {
          const propositionTexts = conclusion.propositionIds.map(
            (id) => propositionTextById[id],
          );
          return (
            <View key={index}>
              <Text variant="titleSmall">Propositions</Text>
              <List.Section>
                {propositionTexts.map((text, i) => (
                  <List.Item key={i} title={`• ${text}`} />
                ))}
              </List.Section>

              <Text variant="titleSmall">Sources</Text>
              <List.Section>
                {conclusion.sourceNames.map((source, i) => (
                  <List.Item key={i} title={`• ${source}`} />
                ))}
              </List.Section>

              <Text variant="titleSmall">URLs</Text>
              <List.Section>
                {conclusion.urls.map((url, i) => (
                  <Tooltip title={url} key={url}>
                    <List.Item key={i} title={`• ${url}`} />
                  </Tooltip>
                ))}
              </List.Section>

              {index < map.conclusions.length - 1 && <Divider />}
            </View>
          );
        })}
      </Card.Content>
    </Card>
  );
};

export default ArgumentMapView;
