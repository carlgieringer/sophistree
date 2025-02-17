import { ReactNode, useMemo } from "react";
import { View } from "react-native";
import {
  Card,
  Title,
  Paragraph,
  Divider,
  Text,
  Chip,
} from "react-native-paper";

import { ArgumentMap } from "@sophistree/common";
import type { Logger } from "@sophistree/common";

import { getOutcomeColorStyle } from "../outcomes/outcomeColors";

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
              <View>
                {conclusion.propositionInfos.map(
                  ({ propositionId, outcome }) => {
                    const text = propositionTextById.get(propositionId)!;
                    const colorStyle = getOutcomeColorStyle(outcome);
                    return (
                      <Paragraph
                        style={{ marginBottom: 10 }}
                        key={propositionId}
                      >
                        {text} <Text style={colorStyle}>[{outcome}]</Text>
                      </Paragraph>
                    );
                  },
                )}
              </View>

              {!!conclusion.appearanceInfo.sourceNames.length && (
                <>
                  <Text variant="titleMedium" style={{ marginBottom: 5 }}>
                    Appearing in
                  </Text>
                  <Text variant="titleSmall">Sources</Text>

                  {conclusion.appearanceInfo.sourceNames.map((source) => (
                    <Paragraph style={{ marginBottom: 10 }} key={source}>
                      {source}
                    </Paragraph>
                  ))}

                  <Text variant="titleSmall">Domains</Text>
                  {conclusion.appearanceInfo.domains.map((domain) => (
                    <Paragraph style={{ marginBottom: 10 }} key={domain}>
                      {domain}
                    </Paragraph>
                  ))}
                </>
              )}
              {!!conclusion.mediaExcerptJustificationInfo.sourceNames
                .length && (
                <>
                  <Text variant="titleMedium" style={{ marginBottom: 5 }}>
                    Based on evidence from
                  </Text>
                  <Text variant="titleSmall">Sources</Text>
                  {conclusion.mediaExcerptJustificationInfo.sourceNames.map(
                    (source) => (
                      <Paragraph style={{ marginBottom: 10 }} key={source}>
                        {source}
                      </Paragraph>
                    ),
                  )}

                  <Text variant="titleSmall">Domains</Text>
                  {conclusion.mediaExcerptJustificationInfo.domains.map(
                    (domain) => (
                      <Paragraph style={{ marginBottom: 10 }} key={domain}>
                        {domain}
                      </Paragraph>
                    ),
                  )}
                </>
              )}

              {index < map.conclusions.length - 1 && <Divider />}
            </View>
          );
        })}
      </Card.Content>
    </Card>
  );
}
