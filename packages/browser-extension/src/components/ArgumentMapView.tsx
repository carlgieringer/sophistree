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

import { ArgumentMap } from "@sophistree/common";

import { usePropositionTexts } from "../sync/hooks";

const ArgumentMapView = ({
  map,
  titleButton,
  isActive,
}: {
  map: ArgumentMap;
  titleButton: ReactNode;
  isActive: boolean;
}) => {
  const neededIds = useMemo(
    () =>
      Array.from(
        new Set(
          map.conclusions
            .flatMap((c) => c.propositionInfos)
            .map((i) => i.propositionId),
        ),
      ),
    [map.conclusions],
  );

  const propositionTextById = usePropositionTexts(neededIds);
  return (
    <Card style={{ marginTop: 16 }}>
      <Card.Content>
        <Title>
          {map.name} {titleButton} {isActive && <Chip>Active</Chip>}
        </Title>
        <Paragraph>Entities: {map.entities.length}</Paragraph>
        {map.conclusions.map((conclusion, index) => {
          const propositionTexts = conclusion.propositionInfos.map(
            ({ propositionId }) => propositionTextById[propositionId],
          );
          return (
            <View key={index}>
              <Text
                variant="titleLarge"
                style={{ marginTop: 20, marginBottom: 10 }}
              >
                Conclusions
              </Text>
              <List.Section>
                {propositionTexts.map((text, i) => (
                  <List.Item key={i} title={`• ${text}`} />
                ))}
              </List.Section>

              {conclusion.appearanceInfo.sourceNames.length ? (
                <>
                  <Text variant="titleMedium">Appearing in</Text>
                  <Text variant="titleSmall">Sources</Text>
                  <List.Section>
                    {conclusion.appearanceInfo.sourceNames.map((source, i) => (
                      <List.Item key={i} title={`• ${source}`} />
                    ))}
                  </List.Section>

                  <Text variant="titleSmall">URLs</Text>
                  <List.Section>
                    {conclusion.appearanceInfo.urls.map((url, i) => (
                      <Tooltip title={url} key={url}>
                        <List.Item key={i} title={`• ${url}`} />
                      </Tooltip>
                    ))}
                  </List.Section>
                </>
              ) : (
                <Text>Appearing in no sources.</Text>
              )}
              {conclusion.mediaExcerptJustificationInfo.sourceNames.length ? (
                <>
                  <Text variant="titleMedium">Based on evidence from</Text>
                  <Text variant="titleSmall">Sources</Text>
                  <List.Section>
                    {conclusion.mediaExcerptJustificationInfo.sourceNames.map(
                      (source, i) => (
                        <List.Item key={i} title={`• ${source}`} />
                      ),
                    )}
                  </List.Section>

                  <Text variant="titleSmall">URLs</Text>
                  <List.Section>
                    {conclusion.mediaExcerptJustificationInfo.urls.map(
                      (url, i) => (
                        <Tooltip title={url} key={url}>
                          <List.Item key={i} title={`• ${url}`} />
                        </Tooltip>
                      ),
                    )}
                  </List.Section>
                </>
              ) : (
                <Text>Based on no evidence</Text>
              )}

              {index < map.conclusions.length - 1 && <Divider />}
            </View>
          );
        })}
      </Card.Content>
    </Card>
  );
};

export default ArgumentMapView;
