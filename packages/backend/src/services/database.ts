import { ArgumentMap } from '../schema';
import { Maps, fromArgumentMap, toArgumentMap } from '../models/maps';
import { CreateTableCommand, DynamoDBClient, ResourceInUseException } from '@aws-sdk/client-dynamodb';

export class DatabaseService {
  private client: DynamoDBClient;
  private tableName: string;

  constructor() {
    this.client = new DynamoDBClient(
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
    this.tableName = process.env.DYNAMODB_TABLE || 'sophistree-maps';
  }

  /**
   * Updates or creates an argument map for a user
   */
  async updateMap(userId: string, map: ArgumentMap): Promise<void> {
    await Maps.put(fromArgumentMap(userId, map)).go();
  }

  /**
   * Retrieves a specific map for a user
   * Returns null if not found
   */
  async getMap(userId: string, mapId: string): Promise<ArgumentMap | null> {
    const result = await Maps.get({ userId, mapId }).go();
    return result.data ? toArgumentMap(result.data) : null;
  }

  /**
   * Lists all maps for a user, sorted by last updated
   */
  async listMaps(userId: string): Promise<ArgumentMap[]> {
    const results = await Maps.query
      .byUser({ userId })
      .go();

    return results.data.map(item => toArgumentMap(item));
  }

  /**
   * Initialize database resources
   * In development, this ensures the DynamoDB table exists
   */
  async init(): Promise<void> {
    if (process.env.NODE_ENV !== 'production') {
      try {
        await this.client.send(
          new CreateTableCommand({
            TableName: this.tableName,
            AttributeDefinitions: [
              { AttributeName: 'pk', AttributeType: 'S' },
              { AttributeName: 'sk', AttributeType: 'S' },
              { AttributeName: 'gsi1pk', AttributeType: 'S' },
              { AttributeName: 'gsi1sk', AttributeType: 'S' }
            ],
            KeySchema: [
              { AttributeName: 'pk', KeyType: 'HASH' },
              { AttributeName: 'sk', KeyType: 'RANGE' }
            ],
            GlobalSecondaryIndexes: [
              {
                IndexName: 'gsi1',
                KeySchema: [
                  { AttributeName: 'gsi1pk', KeyType: 'HASH' },
                  { AttributeName: 'gsi1sk', KeyType: 'RANGE' }
                ],
                Projection: { ProjectionType: 'ALL' },
                ProvisionedThroughput: {
                  ReadCapacityUnits: 5,
                  WriteCapacityUnits: 5
                }
              }
            ],
            ProvisionedThroughput: {
              ReadCapacityUnits: 5,
              WriteCapacityUnits: 5
            }
          })
        );
        console.log('Created local DynamoDB table:', this.tableName);
      } catch (error) {
        // Ignore if table already exists
        if (!(error instanceof ResourceInUseException)) {
          throw error;
        }
      }
    }
  }
}

// Export singleton instance
export const db = new DatabaseService();
