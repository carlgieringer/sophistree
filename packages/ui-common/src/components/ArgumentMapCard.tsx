import { ReactNode, useMemo } from "react";
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
import type { Logger } from "@sophistree/common";

export interface ArgumentMapCardProps {
  map: ArgumentMapCardInfo;
  titleButton: ReactNode;
  isActive?: boolean;
  logger?: Logger;
  updatedAt?: Date;
}

export type ArgumentMapCardInfo = Pick<
  ArgumentMap,
  "name" | "conclusions" | "entities"
>;

export function ArgumentMapCard({
  map,
  titleButton,
  updatedAt,
  isActive = false,
  logger = console,
}: ArgumentMapCardProps) {
  const conclusionIds = useMemo(
    () =>
      new Set(
        map.conclusions
          .flatMap((c) => c.propositionInfos)
          .map((i) => i.propositionId),
      ),
    [map.conclusions],
  );

  const propositionTextById = useMemo(
    () =>
      map.entities.reduce((map, entity) => {
        if (conclusionIds.has(entity.id)) {
          if (entity.type !== "Proposition") {
            logger.error("Conclusion must be a Proposition.");
            return map;
          }
          map.set(entity.id, entity.text);
        }
        return map;
      }, new Map<string, string>()),
    [conclusionIds, logger, map.entities],
  );

  return (
    <Card style={{ marginTop: 16 }}>
      <Card.Content>
        <Title>
          {map.name} {titleButton} {isActive && <Chip>Active</Chip>}
        </Title>
        <Paragraph>Entities: {map.entities.length}</Paragraph>
        {updatedAt && (
          <Paragraph>Last updated: {updatedAt.toLocaleDateString()}</Paragraph>
        )}
        {map.conclusions.map((conclusion, index) => {
          return (
            <View key={index}>
              <Text variant="titleLarge" style={{ marginTop: 20 }}>
                Conclusions
              </Text>
              <List.Section>
                {conclusion.propositionInfos.map(
                  ({ propositionId, outcome }, i) => {
                    const text = propositionTextById.get(propositionId);
                    return (
                      <List.Item key={i} title={`• [${outcome}] ${text}`} />
                    );
                  },
                )}
              </List.Section>

              {conclusion.appearanceInfo.sourceNames.length ? (
                <>
                  <Text variant="titleMedium" style={{ marginBottom: 5 }}>
                    Appearing in
                  </Text>
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
                <Text variant="titleMedium" style={{ marginBottom: 10 }}>
                  Appearing in no sources.
                </Text>
              )}
              {conclusion.mediaExcerptJustificationInfo.sourceNames.length ? (
                <>
                  <Text variant="titleMedium" style={{ marginBottom: 5 }}>
                    Based on evidence from
                  </Text>
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
                <Text variant="titleMedium" style={{ marginBottom: 5 }}>
                  Based on no evidence
                </Text>
              )}

              {index < map.conclusions.length - 1 && <Divider />}
            </View>
          );
        })}
      </Card.Content>
    </Card>
  );
}
