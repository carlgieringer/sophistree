import { ReactNode, useMemo } from "react";
import { View } from "react-native";
import {
  Card,
  Paragraph,
  Divider,
  Text,
  Chip,
  Tooltip,
} from "react-native-paper";

import { UserAvatar } from "./UserAvatar";
import { BulletedList } from "./BulletedList";

import { ArgumentMap } from "@sophistree/common";
import type { Logger } from "@sophistree/common";

import { getOutcomeColorStyle } from "../outcomes/outcomeColors";
import { DateTime } from "luxon";
import { Props as CardTitleProps } from "react-native-paper/lib/typescript/components/Card/CardTitle";

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

  const leftAvatarProps = userInfo && {
    left: ((props) => (
      <Tooltip title={`Published by ${userInfo.displayName}`}>
        <UserAvatar {...userInfo} {...props} />
      </Tooltip>
    )) as CardTitleProps["left"],
  };

  return (
    <Card style={{ marginTop: 16 }}>
      <Card.Title
        title={
          <>
            {map.name} {titleButton} {isActive && <Chip>Active</Chip>}
          </>
        }
        subtitle={
          <>
            <Paragraph>Entities: {map.entities.length}</Paragraph>
            {(createdAt || updatedAt) && (
              <Paragraph>
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
              </Paragraph>
            )}
          </>
        }
        {...leftAvatarProps}
      />

      <Card.Content>
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
                  <BulletedList
                    items={conclusion.appearanceInfo.sourceNames}
                    style={{ marginTop: 4, marginBottom: 12 }}
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
                    style={{ marginTop: 4, marginBottom: 12 }}
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
