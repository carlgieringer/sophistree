#!/bin/bash
set -e

# Check if admin_ip and db_password are provided
if [ "$#" -ne 2 ]; then
    echo "Usage: $0 <admin_ip> <db_password>"
    echo "Example: $0 \"203.0.113.1\" \"mypassword\""
    exit 1
fi

ADMIN_IP=$1
DB_PASSWORD=$2

echo "Starting OS update process..."

# 1. Get the current instance ID
INSTANCE_ID=$(tofu output -raw instance_id)
echo "Current instance ID: $INSTANCE_ID"

# 2. Stop the EC2 instance gracefully
echo "Stopping EC2 instance..."
aws ec2 stop-instances --instance-ids $INSTANCE_ID
aws ec2 wait instance-stopped --instance-ids $INSTANCE_ID

# 3. Create a temporary tfvars file
cat > update.tfvars <<EOF
admin_ip = "$ADMIN_IP"
db_password = "$DB_PASSWORD"
EOF

# 4. Update the instance (will use latest AMI automatically)
echo "Updating instance with latest Amazon Linux 2023 AMI..."
tofu apply -var-file="update.tfvars" -auto-approve

# 5. Clean up
rm update.tfvars

echo "OS update complete! New instance is being initialized..."
echo "The PostgreSQL data volume has been automatically reattached."
echo "You can monitor the instance status using: tofu output public_ip"
