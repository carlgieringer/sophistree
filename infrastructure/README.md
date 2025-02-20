# Infrastructure

```shell
cd infrastructure
aws-vault exec <profile> -- tofu apply
```

If you made changes to Terraform code and want to modify the dev env only first for testing:

```shell
aws-vault exec <profile> -- tofu apply -target=module.sophistree_dev[0]
```

## Logs

```shell
ssh dev.sophistree.app
# Check the user-data.sh logs
less /var/log/cloud-init-output.log
# Check a docker container's logs
sudo docker logs sophistree-web-app
```

## Docker Images and Deployment

Before pushing, you must authenticate.

```shell
docker login -u sophistree
```

### Deploying to Environments

To deploy to dev environment (includes building and pushing images):

```bash
# Build/push the images and deploy them to dev using current package version
npm run build-and-deploy-dev
```

To deploy to production:

```bash
# Create a release and deploy the current package versions to prod
npm run release
```

The production deployment will:

1. Create a GitHub release for the specified version
2. Deploy the specified version to sophistree.app

## Running commands on the containers

```shell
sudo docker compose -f docker-compose.yml -f docker-compose.prod.yml run migrator npx prisma migrate reset
```

## Start just the db container

```shell
sudo docker compose -f docker-compose.yml -f docker-compose.prod.yml up db --detach
```

## Connect to prod DBs

On the instance:

```shell
sudo docker run -it --network web-app_default postgres:16 psql -h sophistree-db -U sophistree
```

## Removing dev S3 Postgres backup S3 buckets

```shell
aws-vault exec <profile> -- aws s3 rm s3://sophistree-postgres-backups-dev --recursive
aws-vault exec <profile> -- aws s3 rb s3://sophistree-postgres-backups-dev
```

## New SSH key

```shell
ssh-keygen -t ed25519 -m PEM -f ~/.ssh/sophistree-env
```
