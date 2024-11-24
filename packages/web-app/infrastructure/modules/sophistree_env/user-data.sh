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
if ! lsblk --fs "$actual_device" | tail -n1 | grep -q "[[:space:]][[:alnum:]]"; then
  # No filesystem detected, create one
  mkfs -t xfs "$actual_device"
fi

# Add to fstab for persistent mount using the actual device path
echo "$actual_device /mnt/postgres_data xfs defaults,nofail 0 2" | tee -a /etc/fstab
mount -a

# Install docker compose plugin
docker_compose_version=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep -o '"tag_name": ".*"' | cut -d'"' -f4)
docker_arch=$(uname -m)
mkdir -p /usr/local/lib/docker/cli-plugins
curl -L https://github.com/docker/compose/releases/download/$docker_compose_version/docker-compose-linux-$docker_arch \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
chmod +x-w /usr/local/lib/docker/cli-plugins/docker-compose

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

# Create app directory and set up docker-compose files
mkdir -p /web-app
cd /web-app

# Create logs directory for Caddy
mkdir -p /var/log/caddy

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
  log {
    output file /var/log/caddy/access.log {
      roll_size 10mb
      roll_keep 10
    }
  }
}' | tee Caddyfile

# Create docker-compose files
echo '${docker_compose_content}' | tee docker-compose.yml
echo '${docker_compose_prod_content}' | tee docker-compose.prod.yml

echo "NODE_ENV=production
DB_PASSWORD_PARAMETER_ARN=${db_password_parameter_arn}
# Use IAM role credentials from the EC2 instance
AWS_REGION=${aws_region}
AWS_SDK_LOAD_CONFIG=1
WEB_APP_IMAGE_VERSION=${web_app_image_version}" | tee web-app.env
chmod 400 web-app.env

echo "CADDY_IMAGE_VERSION=${caddy_image_version}" | tee caddy.env
chmod 400 caddy.env

db_password=$(aws ssm get-parameter --name "${db_password_parameter_arn}" --with-decryption --query "Parameter.Value" --output text)
echo "POSTGRES_PASSWORD=$db_password" | tee -a db.env
chmod 400 db.env

echo "DATABASE_URL=postgresql://sophistree:$db_password@sophistree-db:5432/sophistree" | tee -a migrator.env
chmod 400 migrator.env

# Pull the latest images and start the containers with production config
docker compose -f docker-compose.yml -f docker-compose.prod.yml pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

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
  },
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/caddy/access.log",
            "log_group_name": "${cloudwatch_log_group}",
            "log_stream_name": "caddy-access",
            "timestamp_format": "%Y-%m-%dT%H:%M:%S.%f%z",
            "timezone": "UTC"
          }
        ]
      }
    }
  }
}' | tee /opt/aws/amazon-cloudwatch-agent/bin/config.json

/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -s -c file:/opt/aws/amazon-cloudwatch-agent/bin/config.json
systemctl enable amazon-cloudwatch-agent
systemctl start amazon-cloudwatch-agent
