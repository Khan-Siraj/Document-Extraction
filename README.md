# Document Extraction System

AI-powered document extraction system using OLLAMA for local LLM processing.

## 🚀 Quick Start with Docker

### Prerequisites

- Docker and Docker Compose installed
- OLLAMA running locally with `llama3.2:latest` model

### Deploy

```bash
# Download the docker-compose file
wget https://raw.githubusercontent.com/YOUR_USERNAME/document-extraction/main/docker-compose.prod.yml

# Or create docker-compose.yml with the production configuration

# Start all services
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose -f docker-compose.prod.yml ps
```

Access the application:

- **Frontend**: http://localhost:4200
- **API**: http://localhost:3000

## 🐳 Docker Images

- **API**: [`sirajk78620/doc-extract-api:latest`](https://hub.docker.com/r/sirajk78620/doc-extract-api)
- **Web**: [`sirajk78620/doc-extract-web:latest`](https://hub.docker.com/r/sirajk78620/doc-extract-web)

## 📋 Features

- **PDF Upload**: Upload PDF documents for extraction
- **Dual Extraction Modes**:
  - Markdown: Convert PDFs to clean markdown format
  - Structured (JSON): Extract data based on predefined schemas
- **Job Queue**: Background processing with Bull queue
- **Real-time Status**: Track extraction job progress
- **Export Results**: Download extracted data as JSON

## 🛠️ Tech Stack

**Backend:**

- NestJS
- TypeORM + PostgreSQL
- Bull (Redis queue)
- OLLAMA for AI processing

**Frontend:**

- Angular
- RxJS
- Bootstrap

## 🔧 Configuration

### Environment Variables

Create a `.env` file or modify docker-compose:

```env
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/doc_extract
REDIS_HOST=redis
REDIS_PORT=6379
OLLAMA_BASE_URL=http://host.docker.internal:11434
VISION_MODEL=llama3.2:latest
STRUCT_MODEL=llama3.2:latest
```

### OLLAMA Setup

The application requires OLLAMA running on your host machine:

```bash
# Install OLLAMA
# Visit https://ollama.ai

# Pull required model
ollama pull llama3.2:latest
```

## 📦 Development Setup

### Local Development

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/document-extraction.git
cd document-extraction

# Start infrastructure (PostgreSQL, Redis)
docker-compose up -d postgres redis

# Start API
cd doc-extract-api
npm install
npm run start:dev

# Start Web (in another terminal)
cd doc-extract-web
npm install
npm start
```

### Build Docker Images

```bash
# Build all images
docker-compose build

# Or build individually
docker build -t sirajk78620/doc-extract-api:latest ./doc-extract-api
docker build -t sirajk78620/doc-extract-web:latest ./doc-extract-web
```

## 📝 API Endpoints

- `POST /api/documents/upload` - Upload PDF
- `GET /api/jobs/:id` - Get job status
- `GET /api/results/:documentId` - Get extraction result
- `GET /api/results/:documentId/export/json` - Export as JSON
- `GET /health` - Health check

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

MIT License
