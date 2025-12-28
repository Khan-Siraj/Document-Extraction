# Document Extraction Web App

A web application that extracts structured data from PDF documents using local OLLAMA models. Supports both raw Markdown text extraction and structured JSON extraction.

## 🚀 Features

- **100% Local Processing** - No external AI APIs, all processing happens locally
- **Multi-page PDF Support** - Process documents with multiple pages
- **Dual Extraction Modes** - Raw Markdown text or structured JSON
- **Text-based Extraction** - Uses pdf-parse for fast, pure Node.js processing
- **Real-time Status** - Track extraction job progress
- **Export Results** - Download extracted data as JSON

## 📋 Prerequisites

1. **Node.js 20+**
2. **Docker** (for PostgreSQL and Redis)
3. **OLLAMA** installed locally

### Install OLLAMA and Pull Required Model

```bash
# Install OLLAMA from https://ollama.ai

# Pull the vision model
ollama pull llama3.2-vision
```

## 🛠️ Setup

### 1. Start Infrastructure Services

```bash
docker-compose up -d
```

This starts:

- PostgreSQL on port 5432
- Redis on port 6379

### 2. Start Backend

```bash
cd doc-extract-api
npm install
npm run start:dev
```

Backend runs on http://localhost:3000

### 3. Start Frontend

```bash
cd doc-extract-web
npm install
ng serve
```

Frontend runs on http://localhost:4200

## 📁 Project Structure

```
DOCUMENT_EXTRACTION/
├── docker-compose.yml          # PostgreSQL + Redis
├── doc-extract-api/            # NestJS Backend
│   ├── src/
│   │   ├── documents/          # Upload & document management
│   │   ├── extraction/         # Queue processor & extraction logic
│   │   ├── ollama/             # OLLAMA API integration
│   │   └── results/            # Results endpoints
│   └── .env                    # Configuration
└── doc-extract-web/            # Angular Frontend
    └── src/app/
        ├── pages/              # Upload, Detail, History
        └── services/           # API service
```

## 🔧 Configuration

Edit `doc-extract-api/.env`:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/doc_extract
REDIS_HOST=localhost
REDIS_PORT=6379
OLLAMA_BASE_URL=http://localhost:11434
VISION_MODEL=llama3.2-vision
STRUCT_MODEL=nuextract
UPLOAD_DIR=./uploads
```

## 📡 API Endpoints

| Method | Endpoint                               | Description               |
| ------ | -------------------------------------- | ------------------------- |
| POST   | `/api/documents/upload`                | Upload PDF for extraction |
| GET    | `/api/documents`                       | List all documents        |
| GET    | `/api/documents/:id`                   | Get document details      |
| GET    | `/api/jobs/:id`                        | Get job status            |
| GET    | `/api/results/:documentId`             | Get extraction result     |
| GET    | `/api/results/:documentId/export/json` | Download JSON             |
| GET    | `/api/health`                          | Health check              |

## 🎯 Usage

1. Open http://localhost:4200
2. Upload a PDF document
3. Select document type and extraction mode
4. Wait for processing to complete
5. View and download results

## 📄 Extraction Modes

### Markdown Mode

Extracts text from PDF and converts to clean Markdown format using OLLAMA, preserving:

- Headings and paragraphs
- Lists and tables
- Document structure

### Structured Mode

Extracts data from PDF text into JSON format based on schema:

- **InvoiceSchemaV1** - Invoice number, dates, vendor/customer info, line items, totals

## 🔮 Future Enhancements

- User authentication
- Bulk upload
- Additional schemas (receipts, forms, contracts)
- Export to CSV/Excel
