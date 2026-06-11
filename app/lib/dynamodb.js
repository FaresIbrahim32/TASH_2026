import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const clientConfig = {
  region: process.env.AWS_REGION || "us-east-2",
};

// Load credentials if provided in env
if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  clientConfig.credentials = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  };
}

let client;
let docClient;

if (process.env.NODE_ENV === "production") {
  client = new DynamoDBClient(clientConfig);
  docClient = DynamoDBDocumentClient.from(client, {
    marshallOptions: {
      removeUndefinedValues: true,
      convertEmptyValues: true,
    },
  });
} else {
  // Prevent duplicate connections during Next.js hot reloads in development
  if (!global._dynamoClient) {
    global._dynamoClient = new DynamoDBClient(clientConfig);
    global._dynamoDocClient = DynamoDBDocumentClient.from(global._dynamoClient, {
      marshallOptions: {
        removeUndefinedValues: true,
        convertEmptyValues: true,
      },
    });
  }
  client = global._dynamoClient;
  docClient = global._dynamoDocClient;
}

export { client, docClient };
export function isAwsConfigured() {
  return !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
}
