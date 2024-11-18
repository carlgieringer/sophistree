#!/bin/bash
set -euxo pipefail

# System updates
dnf update -y
dnf install -y docker awscli

# Mount EBS volume for PostgreSQL data
mkdir -p /mnt/postgres_data
# Wait for the EBS volume to be attached
while [ ! -e ${device_name} ]; do
  echo "Waiting for EBS volume to be attached at ${device_name}..."
  sleep 5
done

# Resolve any symbolic links to get the actual device path
actual_device=$(readlink -f ${device_name})

# Check if the device has a filesystem using lsblk
if ! lsblk --fs "$actual_device" | grep -q "[[:space:]][[:alnum:]]"; then
  # No filesystem detected, create one
  mkfs -t xfs "$actual_device"
fi

# Add to fstab for persistent mount using the actual device path
echo "$actual_device /mnt/postgres_data xfs defaults,nofail 0 2" | tee -a /etc/fstab
mount -a

# Start and enable Docker
systemctl enable docker
systemctl start docker

# Configure Docker logging to CloudWatch
echo '{
  "log-driver": "awslogs",
  "log-opts": {
    "awslogs-group": "${cloudwatch_log_group}",
    "awslogs-region": "${aws_region}"
  }
}' | tee /etc/docker/daemon.json

# Restart Docker to apply logging changes
systemctl restart docker

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Create app directory and set up docker-compose files
mkdir -p /web-app
cd /web-app

# Create Caddyfile in the same directory as docker-compose files
echo -e '{
  # Uncomment the acme_ca line when testing Caddy settings to to avoid rate limiting
  # by using the staging endpoint. You can check the status of letsencrypt rate limits at:
  # https://tools.letsdebug.net/cert-search?m=domain&q=sophistree.app&d=168
  # acme_ca https://acme-staging-v02.api.letsencrypt.org/directory
  email ${caddy_email}
  storage s3 {
    region ${aws_region}
    host ${caddy_certs_bucket_host}
    # This acts like a prefix since the host contains the bucket.
    # We do not need a prefix, but the module errors if it is empty.
    bucket caddy-storage
    use_iam_provider true
    insecure false
  }
}

${domain_name} {
  reverse_proxy sophistree-web-app:3000
}' | tee Caddyfile

# Create docker-compose files
echo '${docker_compose_content}' | tee docker-compose.yml
echo '${docker_compose_prod_content}' | tee docker-compose.prod.yml

# Create .env file for docker-compose
echo 'DB_PASSWORD=${db_password}
CLOUDWATCH_LOG_GROUP=${cloudwatch_log_group}
AWS_REGION=${aws_region}
VERSION=${docker_images_version}' | tee .env
chmod 400 .env

# Pull the latest images and start the containers with production config
docker-compose -f docker-compose.yml -f docker-compose.prod.yml pull
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Set up backup script
echo '#!/bin/bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="/tmp/postgres_backup_$TIMESTAMP.sql"
docker exec sophistree-db pg_dump -U sophistree sophistree > $BACKUP_FILE
aws s3 cp $BACKUP_FILE s3://${backup_bucket}/postgres_backup_$TIMESTAMP.sql
rm $BACKUP_FILE' | tee /usr/local/bin/backup-postgres.sh

chmod +x /usr/local/bin/backup-postgres.sh

# Set up hourly cron job for backups
dnf install -y cronie
systemctl enable crond
systemctl start crond
echo "0 * * * * /usr/local/bin/backup-postgres.sh" | crontab -

# Configure CloudWatch agent for monitoring
dnf install -y amazon-cloudwatch-agent
echo '{
  "agent": {
    "metrics_collection_interval": 60,
    "run_as_user": "root"
  },
  "metrics": {
    "metrics_collected": {
      "mem": {
        "measurement": ["mem_used_percent"]
      },
      "disk": {
        "measurement": ["disk_used_percent"],
        "resources": ["/"]
      }
    }
  }
}' | tee /opt/aws/amazon-cloudwatch-agent/bin/config.json

/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -s -c file:/opt/aws/amazon-cloudwatch-agent/bin/config.json
systemctl enable amazon-cloudwatch-agent
systemctl start amazon-cloudwatch-agent