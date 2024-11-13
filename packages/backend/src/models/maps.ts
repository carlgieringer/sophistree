import { Entity, EntityItem } from "electrodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { ArgumentMap } from "../schema";

// Configure DynamoDB client for either production or local development
const client = new DynamoDBClient(
  process.env.NODE_ENV === 'production'
    ? {}
    : {
        endpoint: 'http://localhost:8000',
        region: 'local',
        credentials: {
          accessKeyId: 'local',
          secretAccessKey: 'local'
        }
      }
);

/**
 * Maps Entity - Represents argument maps in DynamoDB
 *
 * Schema:
 * - userId: The owner of the map
 * - mapId: Unique identifier for the map
 * - data: The full ArgumentMap object (validated by Zod before storage)
 * - updatedAt: Timestamp for sorting and tracking changes
 *
 * Indexes:
 * - primary: Retrieve specific maps by userId + mapId
 * - byUser: Retrieve all maps for a user, sorted by updatedAt
 */
export const Maps = new Entity(
  {
    model: {
      entity: 'map',
      version: '1',
      service: 'sophistree',
    },
    attributes: {
      userId: {
        type: 'string',
        required: true,
      },
      mapId: {
        type: 'string',
        required: true,
      },
      data: {
        // Using 'any' since validation is handled by Zod schema
        type: 'any',
        required: true,
      },
      updatedAt: {
        type: 'string',
        required: true,
      },
    },
    indexes: {
      primary: {
        pk: {
          field: 'pk',
          composite: ['userId'],
        },
        sk: {
          field: 'sk',
          composite: ['mapId'],
        },
      },
      byUser: {
        index: 'gsi1',
        pk: {
          field: 'gsi1pk',
          composite: ['userId'],
        },
        sk: {
          field: 'gsi1sk',
          composite: ['updatedAt'],
        },
      },
    },
  },
  { client, table: process.env.DYNAMODB_TABLE || 'sophistree-maps' }
);

// Type for a Map entity from DynamoDB
export type MapEntityType = EntityItem<typeof Maps>;

/**
 * Convert a DynamoDB entity to an ArgumentMap
 * The data field contains our full ArgumentMap object
 */
export function toArgumentMap(entity: MapEntityType): ArgumentMap {
  return entity.data as ArgumentMap;
}

/**
 * Convert an ArgumentMap to a DynamoDB entity
 * Omitting generated fields (pk, sk, gsi1pk, gsi1sk)
 */
export function fromArgumentMap(userId: string, map: ArgumentMap): Omit<MapEntityType, 'pk' | 'sk' | 'gsi1pk' | 'gsi1sk'> {
  return {
    userId,
    mapId: map.id,
    data: map,
    updatedAt: new Date().toISOString(),
  };
}
