# Sophistree Backend

Express + DynamoDB backend for Sophistree, running on AWS Lambda.

## Development Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Install and run DynamoDB Local:
   ```bash
   docker run -p 8000:8000 amazon/dynamodb-local
   ```

3. Start development server:
   ```bash
   npm run dev
   ```

The server will be available at http://localhost:3001.

## Environment Variables

Create a `.env` file with:

```
# Required for Google OAuth verification
GOOGLE_CLIENT_ID=your_client_id

# Optional - defaults shown
PORT=3001
DYNAMODB_TABLE=sophistree-maps
NODE_ENV=development
```

## API Endpoints

All endpoints require a valid Google OAuth2 token in the Authorization header:
```
Authorization: Bearer <token>
```

### Maps

- `GET /maps`
  - List all maps for authenticated user
  - Response: `{ maps: ArgumentMap[] }`

- `GET /maps/:mapId`
  - Get specific map
  - Response: `{ map: ArgumentMap }`

- `POST /maps/:mapId`
  - Update/create map
  - Body: `{ map: ArgumentMap }`
  - Map ID in body must match URL parameter
  - Response: `{ success: true }`

## AWS Deployment

The backend is designed to run on AWS Lambda with API Gateway and DynamoDB.

Infrastructure will be managed with OpenTofu (TODO).

## Development Notes

### DynamoDB Schema

Primary table: `sophistree-maps`

Attributes:
- `pk`: Partition key, format: `USER#<email>`
- `sk`: Sort key, format: `MAP#<mapId>`
- `data`: The full ArgumentMap object
- `userId`: User's email (for GSI)
- `mapId`: Map ID (for GSI)
- `updatedAt`: ISO timestamp

Indexes:
- Primary: `pk` (hash) + `sk` (range)
- GSI1: `userId` (hash) + `updatedAt` (range)
  - For listing user's maps sorted by last update

### Authentication

Uses Google OAuth2 tokens obtained through chrome.identity in the browser extension.
The backend verifies these tokens against Google's OAuth2 userinfo endpoint.
