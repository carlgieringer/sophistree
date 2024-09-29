import React, { ReactNode, useMemo } from "react";
import { View, ScrollView } from "react-native";
import {
  Card,
  Title,
  Paragraph,
  List,
  Divider,
  Text,
  Tooltip,
} from "react-native-paper";
import { useSelector } from "react-redux";

import { ArgumentMap } from "../store/entitiesSlice";
import { RootState } from "../store";

const ArgumentMapView = ({
  map,
  titleButton,
}: {
  map: ArgumentMap;
  titleButton: ReactNode;
}) => {
  const allPropositions = useSelector((state: RootState) =>
    state.entities.maps.flatMap((m) =>
      m.entities.filter((entity) => entity.type === "Proposition")
    )
  );

  const propositionTextById = useMemo(() => {
    const neededIds = new Set(map.conclusions.flatMap((c) => c.propositionIds));
    return Object.fromEntries(
      allPropositions
        .filter((prop) => neededIds.has(prop.id))
        .map((prop) => [prop.id, prop.text])
    );
  }, [map.conclusions, allPropositions]);
  return (
    <ScrollView>
      <Card style={{ marginTop: 16 }}>
        <Card.Content>
          <Title>
            {map.name} {titleButton}
          </Title>
          <Paragraph>Entities: {map.entities.length}</Paragraph>
          <Text
            variant="titleMedium"
            style={{ marginTop: 20, marginBottom: 10 }}
          >
            Conclusions
          </Text>
          {map.conclusions.map((conclusion, index) => {
            const propositionTexts = conclusion.propositionIds.map(
              (id) => propositionTextById[id]
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
                    <Tooltip title={url}>
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
    </ScrollView>
  );
};

export default ArgumentMapView;
