# Sophistree web app

This package is a Next.js web app providing a web UI and REST API for Sophistree.

## Database Setup

The backend uses PostgreSQL as its database, running in Docker.

### Prerequisites

- Docker and Docker Compose installed
- Node.js and npm installed

### Starting the Database

1. Start the PostgreSQL container:

```bash
cd packages/web-app
cp .env.example .env  # update the values as needed
docker compose -f docker/docker-compose.yml -f docker/docker-compose.local.yml --env-file .env -p sophistree up -d db
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

## Testing

The backend uses Jest for testing, with automatic database setup and migration handling.

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

### Debugging

```sh
npm run dev
```

Next.js has a convention of listening for a debugger for the build on the default port (`9229`)
and for the application on the next port (`9230`). So attach a debugger to `localhost:9230`.

### Test Database

The test database is automatically handled:

- Uses a separate database per test file for isolation
- Migrations are applied automatically before tests run
- Database is cleaned between tests

No manual database setup is required - the test infrastructure handles creating and migrating the test database automatically.

## Infrastructure

```shell
cd packages/web-app/infrastructure
aws-vault exec <profile> -- tofu apply
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

# Build base image
docker build -t sophistree/web-app-base -f web-app-base.dockerfile ../../..

# Build and push 'latest' tag
docker compose build
docker compose push

# Build and push with specific version
WEB_APP_IMAGE_VERSION=1.0.0 CADDY_IMAGE_VERSION=1.0.0\
 docker compose build
WEB_APP_IMAGE_VERSION=1.0.0 CADDY_IMAGE_VERSION=1.0.0\
 docker compose push
```

#### Deploying to EC2

To deploy the images on EC2:

```shell
cd /web-app/
# Pull and run with specific version
WEB_APP_IMAGE_VERSION=1.0.0 CADDY_IMAGE_VERSION=1.0.0\
 sudo docker compose -f docker-compose.yml -f docker-compose.prod.yml pull
WEB_APP_IMAGE_VERSION=1.0.0 CADDY_IMAGE_VERSION=1.0.0\
 sudo docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Or use 'latest' tag (if VERSION not specified)
sudo docker compose -f docker-compose.yml -f docker-compose.prod.yml pull
sudo docker compose -f docker-compose.yml -f docker-compose.prod.yml up --force-recreate -d
```

Running commands on the containers:

```shell
sudo docker compose -f docker-compose.yml -f docker-compose.prod.yml run migrator npx prisma migrate reset
```

### Removing dev S3 Postgres backup S3 buckets

```shell
aws-vault exec <profile> -- aws s3 rm s3://sophistree-postgres-backups-dev --recursive
aws-vault exec <profile> -- aws s3 rb s3://sophistree-postgres-backups-dev
```
