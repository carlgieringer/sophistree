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
    pictureUrl?: string;
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
        left={(props) =>
          userInfo && (
            <Tooltip title={`Published by ${userInfo.displayName}`}>
              <UserAvatar {...userInfo} {...props} />
            </Tooltip>
          )
        }
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
