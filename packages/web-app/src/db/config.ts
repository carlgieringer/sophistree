import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";

export async function getPrismaDatabaseUrl() {
  const password = await getDbPasswordFromParameterStore();
  return `postgresql://sophistree:${password}@sophistree-db:5432/sophistree`;
}

async function getDbPasswordFromParameterStore() {
  const ssmClient = new SSMClient({ region: process.env.AWS_REGION });
  const command = new GetParameterCommand({
    Name: process.env.DB_PASSWORD_PARAMETER_ARN,
    WithDecryption: true,
  });

  try {
    const response = await ssmClient.send(command);
    return response.Parameter?.Value;
  } catch (error) {
    console.error("Error fetching DB password from SSM:", error);
    throw error;
  }
}
