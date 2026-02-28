/**
 * One-time script to create the QuizParty DynamoDB table.
 * Run: node scripts/create-quiz-party-table.mjs
 * Loads .env.local from project root so AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION are set.
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { DynamoDBClient, CreateTableCommand } from '@aws-sdk/client-dynamodb';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
for (const name of ['.env.local', '.env']) {
  const path = join(root, name);
  if (existsSync(path)) {
    const content = readFileSync(path, 'utf8');
    for (const line of content.split('\n')) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (m) {
        const key = m[1];
        let val = m[2].trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
          val = val.slice(1, -1);
        if (!process.env[key]) process.env[key] = val;
      }
    }
    break;
  }
}

const tableName = process.env.QUIZ_PARTY_TABLE_NAME || 'QuizParty';
const region = process.env.AWS_REGION || 'us-east-1';

if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
  console.error('Missing AWS credentials. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in .env.local');
  process.exit(1);
}

const client = new DynamoDBClient({
  region,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

async function main() {
  try {
    await client.send(
      new CreateTableCommand({
        TableName: tableName,
        AttributeDefinitions: [
          { AttributeName: 'pk', AttributeType: 'S' },
          { AttributeName: 'sk', AttributeType: 'S' },
        ],
        KeySchema: [
          { AttributeName: 'pk', KeyType: 'HASH' },
          { AttributeName: 'sk', KeyType: 'RANGE' },
        ],
        BillingMode: 'PAY_PER_REQUEST',
      })
    );
    console.log(`Created table: ${tableName}`);
  } catch (err) {
    if (err.name === 'ResourceInUseException') {
      console.log(`Table ${tableName} already exists.`);
    } else if (err.name === 'AccessDeniedException') {
      console.error('Your IAM user does not have permission to create DynamoDB tables.');
      console.error('Add a policy that allows dynamodb:CreateTable (and dynamodb:DescribeTable).');
      console.error('See docs/QUIZ_PARTY_AWS.md for the exact IAM policy JSON.');
      process.exit(1);
    } else {
      console.error(err);
      process.exit(1);
    }
  }
}

main();
