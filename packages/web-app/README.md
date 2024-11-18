# Backend Service

## Database Setup

The backend uses PostgreSQL as its database, running in Docker.

### Prerequisites

- Docker and Docker Compose installed
- Node.js and npm installed

### Starting the Database

1. Start the PostgreSQL container:

```bash
cd packages/web-app
docker compose -p sophistree-backend up -d
```

This will start PostgreSQL on port 5432. The database data is persisted in a Docker volume named 'sophistree_data'.

### Database Migrations

After starting the database container, you need to run migrations to set up the schema:

```bash
# Apply existing migrations
npx prisma migrate deploy

# Create a new migration after schema changes
npx prisma migrate dev --name <migration_name>
```

### Useful Commands

```bash
# View database logs
docker compose logs -f

# Stop the database
docker compose down

# Reset the database (deletes all data)
docker compose down -v
npx prisma migrate reset

# View the database schema
npx prisma studio
```

### Environment Variables

Copy `.env.example` to `.env` and update the values as needed. The default database connection string is:

```sh
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/sophistree"
```

## Testing

The backend uses Jest for testing, with automatic database setup and migration handling.

### Test Setup

- Tests run against a separate test database (`sophistree_test`)
- Migrations are automatically applied before tests run
- Database is cleaned between each test
- Safety checks ensure tests only run against the test database

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode during development
npm run test:watch
```

### Writing Tests

Test files should be placed next to the code they're testing with a `.test.ts` extension. Example:

```typescript
// src/app/api/some-endpoint/route.test.ts
import { NextRequest } from "next/server";
import prisma from "../../../db/client";
import { POST } from "./route";

describe("POST /api/some-endpoint", () => {
  it("should save data to the database", async () => {
    const request = new NextRequest("http://localhost:3000/api/some-endpoint", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        /* test data */
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    // Verify database state
    const data = await prisma.someModel.findFirst();
    expect(data).toBeDefined();
  });
});
```

## Debugging

```sh
npm run dev
```

Next.js has a convention of listening for a debugger for the build on the default port (`9229`)
and for the application on the next port (`9230`). So attach a debugger to `localhost:9230`.

### Test Database

The test database is automatically handled:

- Uses a separate database named `sophistree_test`
- Migrations are applied automatically before tests run
- Database is cleaned between tests
- Connection string: `postgresql://postgres:postgres@localhost:5432/sophistree_test`

No manual database setup is required - the test infrastructure handles creating and migrating the test database automatically.

## Infrastructure

```shell
aws-vault exec <profile> -- tofu apply -var-file=dev.tfvars
```

To update the EC2 instance:

```shell
aws-vault exec <profile> -- ./packages/web-app/infrastructure/update-os.sh "YOUR_DB_PASSWORD"
```

### Logs

```shell
ssh dev.sophistree.app
# Check the user-data.sh logs
less /var/log/cloud-init-output.log
# Check a docker container's logs
sudo docker logs sophistree-web-app
```

### Docker Images

#### Building and Pushing Images

To build and push Docker images locally:

```shell
cd packages/web-app/docker

# Build and push with specific version
VERSION=1.0.0 docker compose build
VERSION=1.0.0 docker compose push

# Or use 'latest' tag (if VERSION not specified)
docker compose build
docker compose push
```

#### Deploying to EC2

To deploy the images on EC2:

```shell
# Pull and run with specific version
VERSION=1.0.0 docker compose -f docker-compose.yml -f docker-compose.prod.yml pull
VERSION=1.0.0 docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Or use 'latest' tag (if VERSION not specified)
docker compose -f docker-compose.yml -f docker-compose.prod.yml pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

The docker-compose files are configured to:

- Build images locally with version tags
- Push to Docker Hub
- Run on EC2 using the pushed images
- Support versioning through the VERSION environment variable

### Removing dev S3 Postgres backup S3 buckets

```shell
aws-vault exec <profile> -- aws s3 rm s3://sophistree-postgres-backups-dev --recursive
aws-vault exec <profile> -- aws s3 rb s3://sophistree-postgres-backups-dev
```
