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
aws-vault exec <profile> -- tofu plan
```

To update the EC2 instance:

```shell
aws-vault exec <profile> -- ./packages/web-app/infrastructure/update-os.sh "YOUR_DB_PASSWORD"
```

### Logs

```shell
less /var/log/cloud-init-output.log
journalctl -u caddy
sudo docker logs sophistree-web-app
```

### Web app Docker container

Locally update

```shell
docker build -t sophistree/web-app -f docker/Dockerfile .
docker login -u sophistree
docker push sophistree/web-app
```

Updating the web app in-place:

```shell
sudo docker-compose -f /web-app/docker-compose.yml -f /web-app/docker-compose.prod.yml\
 pull app
sudo docker-compose -f /web-app/docker-compose.yml -f /web-app/docker-compose.prod.yml\
 up -d --no-deps app
docker-compose
```
