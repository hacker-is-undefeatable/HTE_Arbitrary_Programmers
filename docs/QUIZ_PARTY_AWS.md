# Live Quiz Party – AWS Setup

The Live Quiz Party (create server, join, start, answer, leaderboard, etc.) now uses **AWS DynamoDB** instead of Supabase for state. Supabase is still used for auth, profiles, and lecture sessions.

## 1. AWS credentials

Use the same credentials as for S3 (or any IAM user with DynamoDB access):

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION` (e.g. `us-east-1`)

Add these to `.env.local` (they are not committed).

## 2. IAM permissions for DynamoDB

Your IAM user (e.g. the one whose keys are in `.env.local`) must be allowed to create and use the QuizParty table. If you see **AccessDeniedException** when running the create-table script, add this policy:

1. In **AWS Console** go to **IAM** → **Users** → select your user (e.g. HTE) → **Add permissions** → **Create inline policy**.
2. Click the **JSON** tab, clear the editor, and paste this entire block. **Important:** The `Resource` line must be a real ARN with a 12-digit account number—do **not** leave the text `YOUR_AWS_ACCOUNT_ID` in the JSON or AWS will reject it. Below it is already set to `857685189508` (use your own account ID if different).

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:CreateTable",
        "dynamodb:DescribeTable",
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:Query",
        "dynamodb:BatchWriteItem",
        "dynamodb:BatchGetItem",
        "dynamodb:DeleteItem"
      ],
      "Resource": [
        "arn:aws:dynamodb:us-east-1:857685189508:table/QuizParty"
      ]
    }
  ]
}
```

If you see a JSON error, make sure the `Resource` line is exactly this (no placeholder text):
`"arn:aws:dynamodb:us-east-1:857685189508:table/QuizParty"`

3. Name the policy (e.g. `QuizPartyDynamoDB`), create it, then run the create-table script again.

## 3. Create the DynamoDB table

Run once (from project root):

```bash
npm run quiz-party:create-table
```

This creates a table named `QuizParty` (or the value of `QUIZ_PARTY_TABLE_NAME`). The script is idempotent: if the table already exists, it does nothing.

## 4. Optional: WebSockets via API Gateway

The app works with **REST only**: the frontend polls `GET /api/quiz/status` and `GET /api/quiz/leaderboard`. No WebSocket is required.

To add **real-time updates** (e.g. push when the host advances the question):

1. Create an **API Gateway WebSocket API** in AWS.
2. Deploy a **Lambda** that handles `$connect`, `$disconnect`, and a default route (e.g. subscribe by `server_id`), and that can post messages to connection IDs (e.g. when Next.js calls a “broadcast” endpoint).
3. Set `NEXT_PUBLIC_QUIZ_WS_URL` in `.env.local` to your WebSocket URL (e.g. `wss://xxxx.execute-api.region.amazonaws.com/stage`).
4. The frontend can then subscribe to the WebSocket for status/leaderboard updates and optionally reduce polling.

Lambda and API Gateway setup is not included in this repo; use the AWS Console or IaC (SAM/CloudFormation/CDK) to create the WebSocket API and Lambda, and point the client at the resulting URL.

## 5. Summary

| What            | Before     | After        |
|-----------------|-----------|-------------|
| Quiz state      | Supabase  | DynamoDB    |
| Create/join/…  | Supabase  | DynamoDB    |
| Lecture data   | Supabase  | Supabase    |
| Auth           | Supabase  | Supabase    |
| Transport      | REST + poll | REST + poll (WebSocket optional) |
