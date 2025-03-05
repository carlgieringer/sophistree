import { ReactNode, useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { Card, Divider, Text, Chip, Tooltip, Title } from "react-native-paper";

import { UserAvatar } from "./UserAvatar";
import { BulletedList } from "./BulletedList";

import { ArgumentMap } from "@sophistree/common";
import type { Logger } from "@sophistree/common";

import { getOutcomeColorStyle } from "../outcomes/outcomeColors";
import { DateTime } from "luxon";

export interface ArgumentMapCardProps {
  map: ArgumentMapCardInfo;
  titleButton: ReactNode;
  isActive?: boolean;
  logger?: Logger;
  createdAt?: string;
  updatedAt?: string;
  userInfo?: {
    id: string;
    displayName: string;
  };
}

export type ArgumentMapCardInfo = Pick<
  ArgumentMap,
  "name" | "conclusions" | "entities"
>;

export function ArgumentMapCard({
  map,
  titleButton,
  createdAt,
  updatedAt,
  isActive = false,
  logger = console,
  userInfo,
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

  const createdAtDateTime = useMemo(
    () => createdAt && DateTime.fromISO(createdAt),
    [createdAt],
  );
  const updatedAtDateTime = useMemo(
    () => updatedAt && DateTime.fromISO(updatedAt),
    [updatedAt],
  );

  return (
    <Card style={{ marginTop: 16 }}>
      <Card.Content>
        <Title>
          {map.name} {titleButton} {isActive && <Chip>Active</Chip>}
        </Title>

        <View style={styles.mapInfo}>
          {userInfo && (
            <Tooltip title={`Published by ${userInfo.displayName}`}>
              <UserAvatar {...userInfo} size={12} />
            </Tooltip>
          )}
          <Text>Entities: {map.entities.length}</Text>
          {(createdAt || updatedAt) && (
            <>
              {createdAtDateTime && (
                <>
                  {" "}
                  <Tooltip title={createdAtDateTime.toISO() || ""}>
                    <Text>
                      Created: {createdAtDateTime.toRelativeCalendar()}
                    </Text>
                  </Tooltip>
                </>
              )}
              {updatedAtDateTime && (
                <>
                  {" "}
                  <Tooltip title={updatedAtDateTime.toISO() || ""}>
                    <Text>
                      Updated: {updatedAtDateTime.toRelativeCalendar()}
                    </Text>
                  </Tooltip>
                </>
              )}
            </>
          )}
        </View>

        {map.conclusions.map((conclusion, index) => {
          return (
            <View key={index}>
              <Text variant="titleLarge" style={{ marginTop: 12 }}>
                Conclusions
              </Text>
              <View>
                <BulletedList
                  items={conclusion.propositionInfos.map(
                    ({ propositionId, outcome }) => {
                      const text = propositionTextById.get(propositionId)!;
                      const colorStyle = getOutcomeColorStyle(outcome);
                      return (
                        <Text key={propositionId}>
                          {text} <Text style={colorStyle}>[{outcome}]</Text>
                        </Text>
                      );
                    },
                  )}
                  style={{ marginTop: 4 }}
                />
              </View>

              {!!conclusion.appearanceInfo.sourceNames.length && (
                <>
                  <Text variant="titleMedium" style={{ marginBottom: 5 }}>
                    Appearing in
                  </Text>
                  <Text variant="titleSmall">Sources</Text>
                  <BulletedList
                    items={conclusion.appearanceInfo.sourceNames}
                    style={{ marginTop: 4 }}
                  />

                  <Text variant="titleSmall">Domains</Text>
                  <BulletedList
                    items={conclusion.appearanceInfo.domains}
                    style={{ marginTop: 4 }}
                  />
                </>
              )}
              {!!conclusion.mediaExcerptJustificationInfo.sourceNames
                .length && (
                <>
                  <Text variant="titleMedium" style={{ marginBottom: 5 }}>
                    Based on evidence from
                  </Text>
                  <Text variant="titleSmall">Sources</Text>
                  <BulletedList
                    items={conclusion.mediaExcerptJustificationInfo.sourceNames}
                    style={{ marginTop: 4 }}
                  />

                  <Text variant="titleSmall">Domains</Text>
                  <BulletedList
                    items={conclusion.mediaExcerptJustificationInfo.domains}
                    style={{ marginTop: 4 }}
                  />
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

const styles = StyleSheet.create({
  mapInfo: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "center",
  },
});
