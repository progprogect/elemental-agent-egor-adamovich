# Instagram Doctor Bot

A conversational AI bot for Instagram that acts as a cosmetic doctor, handling patient inquiries and appointment bookings.

## Features

- Natural conversation flow using GPT-4
- Conversation history management
- Appointment booking through natural dialogue
- Instagram Direct Messages integration
- PostgreSQL database for data persistence

## Prerequisites

- Node.js 18+ 
- PostgreSQL database
- Instagram Business Account
- Meta App with Instagram Graph API access
- OpenAI API key

## Setup

1. Clone the repository and install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` and fill in:
- `DATABASE_URL` - PostgreSQL connection string
- `INSTAGRAM_PAGE_ACCESS_TOKEN` - Your Instagram Page Access Token
- `INSTAGRAM_VERIFY_TOKEN` - A random string for webhook verification
- `OPENAI_API_KEY` - Your OpenAI API key
- `OPENAI_MODEL` - Model to use (gpt-4 or gpt-3.5-turbo)

3. Set up the database:
```bash
npx prisma generate
npx prisma migrate dev
```

4. Build the project:
```bash
npm run build
```

5. Start the server:
```bash
npm start
```

For development:
```bash
npm run dev
```

## Instagram Webhook Setup

1. In Meta Developers Console, configure your webhook:
   - Callback URL: `https://your-domain.com/webhook/instagram`
   - Verify Token: The same value as `INSTAGRAM_VERIFY_TOKEN` in your `.env`
   - Subscribe to: `messages` event

2. Ensure your Instagram account is connected to a Facebook Page

3. Get Page Access Token with permissions:
   - `instagram_basic`
   - `instagram_manage_messages`

## Deployment on Railway

1. Create a new Railway project
2. Add PostgreSQL service
3. Connect your GitHub repository
4. Set environment variables in Railway dashboard
5. Deploy

The `railway.json` file is already configured for Railway deployment.

## Architecture

- **Backend**: Node.js + TypeScript + Express
- **Database**: PostgreSQL with Prisma ORM
- **LLM**: OpenAI GPT-4/GPT-3.5-turbo
- **Messaging**: Instagram Graph API

## Important Notes

- The bot NEVER provides medical diagnoses or treatment advice
- All medical concerns are redirected to in-person consultations
- Conversation history is maintained for context-aware responses
- Appointment data is stored in the database for admin review

## License

ISC

