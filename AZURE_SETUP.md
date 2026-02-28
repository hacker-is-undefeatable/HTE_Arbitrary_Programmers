# Azure OpenAI (HKUST) Setup Guide

## Overview
Your application has been configured to use the HKUST Azure OpenAI API instead of the standard OpenAI API. The dashboard now shows proper error handling and will display correctly even when data is loading.

## Configuration

### 1. Create `.env.local` File
In the root directory of your project, create a `.env.local` file with the following content:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# Azure OpenAI API (HKUST)
AZURE_OPENAI_API_KEY=your_hkust_azure_api_key_here
AZURE_OPENAI_ENDPOINT=https://hkust.azure-api.net/openai
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o-mini
AZURE_OPENAI_API_VERSION=2024-10-21

# Next.js
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Database
DATABASE_URL=your_supabase_db_url_here

# Environment Mode
NODE_ENV=development
```

### 2. Replace Placeholder Values
Replace the following with your actual credentials:
- `AZURE_OPENAI_API_KEY`: Your HKUST Azure subscription key
- `AZURE_OPENAI_ENDPOINT`: Should be `https://hkust.azure-api.net/openai` (provided)
- `AZURE_OPENAI_DEPLOYMENT_NAME`: `gpt-4o-mini` (or your deployment name)
- `AZURE_OPENAI_API_VERSION`: `2024-10-21` (latest API version)

### 3. Verify API Connection
The Azure endpoint uses this format:
```
https://hkust.azure-api.net/openai/deployments/gpt-4o-mini/chat/completions?api-version=2024-10-21
```

With header:
```
api-key: <YOUR_SUBSCRIPTION_KEY>
```

## What Changed

### Files Modified:

1. **src/utils/aiService.ts**
   - Replaced OpenAI library with AzureOpenAI client
   - Changed from `openai` to `AzureOpenAI`
   - Implemented lazy-loading client initialization to prevent build errors
   - Updated all API calls to use Azure deployment configuration

2. **src/app/dashboard/page.tsx**
   - Enhanced error handling for data loading
   - Better error messages when profile or data is unavailable
   - Graceful handling of missing revision schedule data
   - Improved loading state UI

3. **.env.example**
   - Added Azure OpenAI configuration variables
   - Updated with correct endpoint and API version

4. **Other files**
   - Removed unused imports to fix TypeScript compilation

## Testing

### Local Development
```bash
npm run dev
```

The dashboard should now:
- Load without errors
- Display your profile information
- Show mastery scores and topics
- Handle missing data gracefully

### API Testing
Test the AI explanation API:
```bash
curl -X POST http://localhost:3000/api/ai-explanation \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What is 2+2?",
    "userAnswer": "5",
    "correctAnswer": "4",
    "topic": "algebra",
    "masteryLevel": 50
  }'
```

## Troubleshooting

### Build Failure
If you get a build error about missing credentials:
1. Ensure `.env.local` exists in the root directory
2. Verify all required Azure variables are set
3. Run `npm run build` again

### API Errors
If you get 401/403 errors:
1. Check your Azure API key is correct
2. Verify the endpoint URL matches your Azure resource
3. Ensure the deployment name is correct

### Connection Issues
1. Test the endpoint directly with `curl`:
```bash
curl https://hkust.azure-api.net/openai/deployments/gpt-4o-mini/chat/completions?api-version=2024-10-21 \
    -H "Content-Type: application/json" \
    -H "api-key: YOUR_KEY_HERE" \
    -d '{"messages": [{"role": "user", "content": "Hello"}]}'
```

2. If that fails, your key or endpoint is incorrect

## Next Steps
1. Add `.env.local` to your `.gitignore` (it should already be there)
2. Test locally with `npm run dev`
3. Deploy to your hosting platform with the Azure credentials configured

## Security Notes
- **Never** commit `.env.local` to version control
- Always use environment variables for sensitive data
- Store credentials securely in your deployment platform (Vercel, Netlify, etc.)
