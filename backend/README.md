# MindEase Backend API

AI-Powered Therapist Chatbot Backend Service

## Overview

This is the backend service for MindEase, an AI-powered therapist chatbot designed to provide accessible, anonymous, 24/7 mental health support. The backend is built with Node.js, Express, TypeScript, and uses PostgreSQL with Prisma ORM.

## Features

- 🤖 **AI-Powered Conversations**: Integration with OpenAI GPT-3.5 Turbo for therapeutic responses
- 🔐 **Secure Authentication**: JWT-based auth with support for anonymous users
- 💬 **Real-time Chat**: WebSocket support for real-time messaging
- 🗄️ **Data Management**: Prisma ORM with PostgreSQL for reliable data storage
- 📊 **Analytics & Monitoring**: Comprehensive logging and admin analytics
- 🔒 **Privacy & Security**: End-to-end encryption, GDPR compliance features
- 🚀 **Scalable Architecture**: Modular design with middleware and services

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **AI**: OpenAI API (GPT-3.5 Turbo)
- **Real-time**: Socket.IO
- **Authentication**: JWT
- **Logging**: Winston
- **Validation**: Express Validator
- **Security**: Helmet, CORS, Rate Limiting

## Project Structure

```
src/
├── config/
│   └── database.ts          # Database configuration
├── middleware/
│   ├── authMiddleware.ts     # JWT authentication
│   ├── errorHandler.ts      # Global error handling
│   └── requestLogger.ts     # Request logging
├── routes/
│   ├── admin.ts             # Admin analytics routes
│   ├── auth.ts              # Authentication routes
│   ├── chat.ts              # Chat messaging routes
│   ├── conversation.ts      # Conversation management
│   ├── health.ts            # Health check endpoints
│   └── user.ts              # User management
├── services/
│   ├── aiService.ts         # OpenAI integration
│   ├── encryptionService.ts # Data encryption
│   └── websocketService.ts  # Real-time messaging
├── utils/
│   ├── logger.ts            # Logging configuration
│   └── validation.ts        # Input validation helpers
├── index.ts                 # Application entry point
prisma/
└── schema.prisma            # Database schema
```

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL 14+
- OpenAI API Key

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd mindease/backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   ```
   
   Update `.env` with your configuration:
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/mindease_db"
   JWT_SECRET=your_jwt_secret_key_here
   OPENAI_API_KEY=your_openai_api_key_here
   ENCRYPTION_KEY=your_32_character_encryption_key_here
   ```

4. **Database Setup**
   ```bash
   # Generate Prisma client
   npm run db:generate
   
   # Run database migrations
   npm run db:migrate
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

The server will start on `http://localhost:8080`

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run db:generate` - Generate Prisma client
- `npm run db:migrate` - Run database migrations
- `npm run db:reset` - Reset database and run migrations
- `npm run db:studio` - Open Prisma Studio
- `npm run lint` - Run ESLint
- `npm run test` - Run tests

## API Endpoints

### Authentication
- `POST /api/auth/anonymous` - Create anonymous session
- `POST /api/auth/register` - Register with email
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/validate` - Validate token

### Chat
- `POST /api/chat/message` - Send message and get AI response
- `GET /api/chat/conversation/:id` - Get conversation history
- `POST /api/chat/stream` - Stream AI responses (SSE)

### Conversations
- `GET /api/conversations` - Get user conversations
- `GET /api/conversations/:id` - Get specific conversation
- `DELETE /api/conversations/:id` - Delete conversation
- `PATCH /api/conversations/:id` - Update conversation title

### User Management
- `GET /api/users/profile` - Get user profile
- `GET /api/users/stats` - Get user statistics
- `DELETE /api/users/account` - Delete user account (GDPR)

### Admin (Requires Admin Secret)
- `GET /api/admin/stats` - System statistics
- `GET /api/admin/logs` - System logs
- `GET /api/admin/errors` - Error logs
- `GET /api/admin/usage` - API usage analytics

### Health
- `GET /api/health` - Basic health check
- `GET /api/health/detailed` - Detailed health information
- `GET /api/health/live` - Liveness probe
- `GET /api/health/ready` - Readiness probe

## WebSocket Events

### Client to Server
- `chat_message` - Send chat message
- `get_conversations` - Request conversations list
- `get_conversation` - Request conversation details
- `typing` - User typing indicator
- `stop_typing` - Stop typing indicator

### Server to Client
- `message_saved` - User message saved confirmation
- `ai_typing` - AI is generating response
- `ai_stopped_typing` - AI finished generating
- `ai_response` - AI response message
- `conversations_list` - List of conversations
- `conversation_messages` - Conversation history
- `error` - Error occurred

## Database Schema

The application uses the following main entities:

- **Users**: Anonymous and registered users
- **Sessions**: JWT session management
- **Conversations**: Chat conversation containers
- **Messages**: Individual chat messages
- **SystemLogs**: Application logs
- **ErrorLogs**: Error tracking
- **ApiUsage**: Usage analytics

## Security Features

- JWT-based authentication
- Rate limiting per IP and user
- Input validation and sanitization
- SQL injection prevention via Prisma
- CORS protection
- Helmet security headers
- End-to-end message encryption
- Anonymous user support
- GDPR compliance features

## Monitoring & Logging

- Winston-based structured logging
- Request/response logging with correlation IDs
- Error tracking in database
- Health check endpoints
- API usage analytics
- Performance metrics

## Deployment

### Docker (Recommended)

```bash
# Build image
docker build -t mindease-backend .

# Run with docker-compose
docker-compose up -d
```

### Manual Deployment

1. Build the application:
   ```bash
   npm run build
   ```

2. Set environment variables for production

3. Run migrations:
   ```bash
   npm run db:migrate
   ```

4. Start the server:
   ```bash
   npm start
   ```

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `NODE_ENV` | Environment (development/production) | No | development |
| `PORT` | Server port | No | 3001 |
| `DATABASE_URL` | PostgreSQL connection string | Yes | - |
| `JWT_SECRET` | JWT signing secret | Yes | - |
| `JWT_EXPIRES_IN` | JWT expiration time | No | 24h |
| `OPENAI_API_KEY` | OpenAI API key | Yes | - |
| `OPENAI_MODEL` | OpenAI model to use | No | gpt-3.5-turbo |
| `ENCRYPTION_KEY` | 32-byte hex key for encryption | Yes | - |
| `FRONTEND_URL` | Frontend URL for CORS | No | http://localhost:3000 |
| `ADMIN_SECRET` | Admin API access secret | No | - |
| `LOG_LEVEL` | Logging level | No | info |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | No | 900000 |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | No | 100 |

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Ensure linting passes: `npm run lint`
6. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the API endpoints above

## Roadmap

- [ ] Redis integration for session management
- [ ] Rate limiting with Redis
- [ ] Message queue for background processing
- [ ] Multi-language support
- [ ] Voice message support
- [ ] Advanced analytics dashboard
- [ ] A/B testing framework
- [ ] Auto-scaling configuration
