# Document Extraction Web App – Build Plan for Coding Agent

## 1. Overview

Goal: Build a web application that lets users upload PDF documents (invoices, forms, contracts, receipts) and extracts structured data using local OLLAMA models.

Key properties:
- 100% local processing (no external AI APIs)
- Multi-page PDF support
- Both raw text (Markdown) and structured JSON extraction
- Modular architecture (easy to extend with new schemas and models)

Target stack:
- Backend: NestJS (TypeScript)
- Frontend: Angular
- Queue: Bull (Redis)
- Database: PostgreSQL (or MongoDB)
- AI Engine: OLLAMA running locally on http://localhost:11434

---

## 2. High-Level Architecture

```mermaid
flowchart TD
  U[User Browser] -->|Upload PDF| FE[Angular Frontend]
  FE -->|POST /api/documents/upload| API[NestJS API]
  API -->|Store file + job| DB[(Database)]
  API -->|Add Job| Q[(Bull Queue)]
  W[Worker (Nest + Bull)] -->|Get Job| Q
  W -->|Read PDF| FS[(File Storage)]
  W -->|Convert pages to images/text| PRE[Preprocessing]
  PRE -->|Call OLLAMA| OLLAMA[OLLAMA Server 11434]
  OLLAMA -->|Markdown/JSON| W
  W -->|Save ExtractionResult| DB
  FE -->|GET /api/jobs/:id| API
  FE -->|GET /api/results/:docId| API
```

---

## 3. Functional Requirements

### 3.1 Core Features

1. Upload PDF documents via web UI.
2. Create an extraction job per uploaded document.
3. Process PDFs asynchronously (using Bull queue):
   - Option A: Extract raw text in Markdown form.
   - Option B: Extract structured JSON according to a predefined schema.
4. Support at least one specialized schema (e.g. "Invoice").
5. Provide an API and UI to:
   - Check job status (queued, processing, completed, failed).
   - Fetch extraction results.
6. Store results and allow JSON download.

### 3.2 Non-Functional

- Processing should be robust for PDFs up to ~20MB and ~20–30 pages.
- System must not expose OLLAMA port publicly (only backend can call it).
- Errors should be logged and exposed via job `errorMessage` field.

---

## 4. Technology Choices & Dependencies

### 4.1 Backend (NestJS)

Install (example using npm):

```bash
npm install @nestjs/config @nestjs/typeorm typeorm pg
npm install @nestjs/bull bull ioredis
npm install multer @nestjs/platform-express
npm install axios
```

PDF processing (pick suitable libs depending on OS constraints):

```bash
# For PDF -> images (scanned docs)
npm install pdf2pic

# For PDF text extraction (digital PDFs)
npm install pdf-parse
```

### 4.2 Frontend (Angular)

```bash
ng new doc-extract-web
cd doc-extract-web
npm install @angular/material @angular/forms @angular/common@latest @angular/router@latest
```

### 4.3 External Services

- Redis server (for Bull): default `redis://localhost:6379`
- Database (Postgres) reachable via `DATABASE_URL`
- OLLAMA server running at `http://localhost:11434`

---

## 5. Data Model (Backend)

> Use TypeORM entities or Mongoose schemas with equivalent fields.

### 5.1 Document

```ts
// document.entity.ts
@Entity('documents')
export class DocumentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  originalFileName: string;

  @Column()
  storedPath: string;

  @Column()
  mimeType: string; // e.g. application/pdf

  @Column({ nullable: true })
  pageCount: number;

  @Column({ default: 'generic' })
  type: 'invoice' | 'receipt' | 'form' | 'contract' | 'generic';

  @CreateDateColumn()
  createdAt: Date;
}
```

### 5.2 ExtractionJob

```ts
// extraction-job.entity.ts
@Entity('extraction_jobs')
export class ExtractionJobEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  documentId: string;

  @ManyToOne(() => DocumentEntity)
  @JoinColumn({ name: 'documentId' })
  document: DocumentEntity;

  @Column({ default: 'queued' })
  status: 'queued' | 'processing' | 'completed' | 'failed';

  @Column({ default: 'markdown' })
  mode: 'markdown' | 'structured';

  @Column({ nullable: true })
  schemaName: string; // e.g. "InvoiceSchemaV1"

  @Column({ nullable: true, type: 'text' })
  errorMessage: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date | null;
}
```

### 5.3 ExtractionResult

```ts
// extraction-result.entity.ts
@Entity('extraction_results')
export class ExtractionResultEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  jobId: string;

  @OneToOne(() => ExtractionJobEntity)
  @JoinColumn({ name: 'jobId' })
  job: ExtractionJobEntity;

  @Column()
  documentId: string;

  @OneToOne(() => DocumentEntity)
  @JoinColumn({ name: 'documentId' })
  document: DocumentEntity;

  @Column({ type: 'text', nullable: true })
  rawText: string; // concatenated Markdown

  @Column({ type: 'jsonb', nullable: true })
  structuredJson: any; // parsed JSON

  @Column({ default: '' })
  modelUsed: string; // e.g. llama3.2-vision

  @Column({ type: 'jsonb', nullable: true })
  perPageMetadata: any; // e.g. OCR confidences
}
```

### 5.4 SchemaConfig (for structured extraction)

```ts
// schema-config.entity.ts
@Entity('schema_configs')
export class SchemaConfigEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string; // e.g. InvoiceSchemaV1

  @Column({ type: 'jsonb' })
  jsonSchema: any; // expected keys & types

  @Column({ type: 'text' })
  promptTemplate: string; // LLM instruction template
}
```

---

## 6. Backend Modules & Responsibilities

### 6.1 AppModule

- Import:
  - `ConfigModule`
  - `TypeOrmModule.forRoot(...)`
  - `BullModule.forRoot(...)`
  - `DocumentModule`
  - `ExtractionModule`
  - `ResultModule`

### 6.2 DocumentModule

Responsibilities:
- Handle file upload
- Create `DocumentEntity` and initial `ExtractionJobEntity`

Endpoints:

```http
POST /api/documents/upload
  form-data: file (PDF), type (optional: invoice, form, contract, generic), mode (markdown/structured), schemaName (for structured)

GET /api/documents/:id
  → returns document metadata + last job
```

Implementation notes:
- Use `FileInterceptor` from `@nestjs/platform-express` with `multer` disk storage.
- Save file to `UPLOAD_DIR` (configurable via env).

### 6.3 ExtractionModule (Queue + Worker)

Responsibilities:
- Define Bull queue `extraction`.
- Worker processes jobs and calls OLLAMA.

Queue config:

```ts
BullModule.registerQueue({
  name: 'extraction',
});
```

Processor skeleton:

```ts
// extraction.processor.ts
@Processor('extraction')
export class ExtractionProcessor {
  constructor(
    private readonly ollamaService: OllamaExtractionService,
    private readonly docService: DocumentService,
    private readonly jobRepo: Repository<ExtractionJobEntity>,
    private readonly resultRepo: Repository<ExtractionResultEntity>,
  ) {}

  @Process()
  async handle(job: Job<{ jobId: string }>) {
    const { jobId } = job.data;

    const extractionJob = await this.jobRepo.findOne({
      where: { id: jobId },
      relations: ['document'],
    });

    // 1. Update status to processing
    // 2. Run PDF -> image/text pipeline
    // 3. For each page, call ollamaService
    // 4. Aggregate results
    // 5. Save ExtractionResultEntity
    // 6. Update job status & timestamps
  }
}
```

### 6.4 OllamaExtractionService

Responsibilities:
- Provide simpler methods for calling OLLAMA:
  - `extractMarkdownFromImage(imagePath: string)`
  - `extractStructuredFromImage(imagePath: string, schema: SchemaConfigEntity)`
  - `extractStructuredFromText(text: string, schema: SchemaConfigEntity)`

Implementation outline:

```ts
// ollama-extraction.service.ts
@Injectable()
export class OllamaExtractionService {
  private readonly baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  private readonly visionModel = process.env.VISION_MODEL || 'llama3.2-vision';
  private readonly structModel = process.env.STRUCT_MODEL || 'nuextract';

  constructor(private readonly http: HttpService) {}

  async extractMarkdownFromImage(imagePath: string): Promise<string> {
    const imageData = await fs.promises.readFile(imagePath);
    const base64Image = imageData.toString('base64');

    const prompt = `You are a document parsing assistant. Convert this page into clean Markdown.
- Preserve headings, paragraphs, lists, and tables.
- Do not omit any text.
- Do not summarize or interpret.
- Return only Markdown, no explanations.`;

    const body = {
      model: this.visionModel,
      messages: [
        {
          role: 'user',
          content: prompt,
          images: [base64Image],
        },
      ],
      stream: false,
      options: {
        temperature: 0.1,
        num_predict: 2048,
      },
    };

    const res = await this.http
      .post(`${this.baseUrl}/api/chat`, body)
      .toPromise();

    return res.data.message.content;
  }

  async extractStructuredFromImage(
    imagePath: string,
    schema: SchemaConfigEntity,
  ): Promise<any> {
    const imageData = await fs.promises.readFile(imagePath);
    const base64Image = imageData.toString('base64');

    const schemaJson = JSON.stringify(schema.jsonSchema, null, 2);

    const prompt = `${schema.promptTemplate}

JSON Schema:
${schemaJson}

Instructions:
- Extract all fields you can.
- Use null for missing values.
- Do not add extra fields not in schema.
- Return ONLY valid JSON.`;

    const body = {
      model: this.structModel,
      messages: [
        {
          role: 'user',
          content: prompt,
          images: [base64Image], // if struct model supports vision
        },
      ],
      stream: false,
      options: {
        temperature: 0.0,
        num_predict: 1024,
      },
    };

    const res = await this.http
      .post(`${this.baseUrl}/api/chat`, body)
      .toPromise();

    const text = res.data.message.content;
    // Expect pure JSON
    return JSON.parse(text);
  }

  async extractStructuredFromText(
    text: string,
    schema: SchemaConfigEntity,
  ): Promise<any> {
    const schemaJson = JSON.stringify(schema.jsonSchema, null, 2);

    const prompt = `${schema.promptTemplate}

JSON Schema:
${schemaJson}

Document Text:
${text}

Instructions:
- Extract all fields you can.
- Use null for missing values.
- Do not add extra fields.
- Return ONLY valid JSON.`;

    const body = {
      model: this.structModel,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      stream: false,
      options: {
        temperature: 0.0,
        num_predict: 1024,
      },
    };

    const res = await this.http
      .post(`${this.baseUrl}/api/chat`, body)
      .toPromise();

    return JSON.parse(res.data.message.content);
  }
}
```

> Note: Adjust vision vs text model usage depending on which models are installed (e.g. `llama3.2-vision`, `nuextract`).

### 6.5 ResultModule

Endpoints:

```http
GET /api/jobs/:id
  → { id, status, errorMessage, documentId }

GET /api/results/:documentId
  → { document, job, rawText, structuredJson, modelUsed }

GET /api/results/:documentId/export/json
  → application/json download
```

---

## 7. PDF Preprocessing Pipeline

### 7.1 For Scanned PDFs / Vision Mode

1. Use `pdf2pic` or similar to convert each PDF page to PNG.
2. Store page images in a temp directory (e.g. `uploads/pages/<documentId>/page-1.png`).
3. For each image, call `extractMarkdownFromImage` or `extractStructuredFromImage`.
4. Aggregate results:
   - Markdown: join pages with `

--- Page X ---

`.
   - JSON: for invoices, either:
     - Extract per page and merge; or
     - Extract once from full doc text.

### 7.2 For Digital PDFs / Text Mode

1. Use `pdf-parse` to extract raw text.
2. If extremely long, chunk into ~2,000–3,000 character segments.
3. Use `extractStructuredFromText` on full or chunked text.
4. Option: also generate Markdown with a text-only model.

Implementation note:
- In the first version, implement **one consistent pipeline**:
  - Always convert to images and use vision model.
  - Only optimize later if needed.

---

## 8. Frontend (Angular) Implementation Plan

### 8.1 Routes

- `/upload` – main page for uploading and tracking jobs
- `/documents/:id` – detail view for a specific document (original PDF + extraction)
- `/history` – optional list of past documents

### 8.2 Services

```ts
// api.service.ts
getDocument(id: string)
getJob(id: string)
uploadDocument(file: File, options: { type: string; mode: string; schemaName?: string })
getResult(documentId: string)
```

### 8.3 UploadComponent

- File input (accept=`application/pdf`).
- Dropdown: document type (`invoice`, `form`, `contract`, `generic`).
- Toggle: `mode = markdown | structured`.
- If `structured`, dropdown for schema (e.g. `InvoiceSchemaV1`).
- On submit:
  - Call `uploadDocument`.
  - Redirect to `/documents/:id?jobId=...`.

### 8.4 DocumentDetailComponent

- On init:
  - Fetch document metadata.
  - Resolve `jobId` from query param or last job.
- Poll job status every 3–5 seconds until `status === 'completed'` or `failed`.
- When `completed`:
  - Fetch result (rawText + structuredJson).
  - Display two tabs:
    - **Structured View**: pretty JSON viewer / key-value list.
    - **Raw Text View**: `<pre>` Markdown (basic styling).
- Add button to download JSON.
- Optional: embed PDF viewer using `pdf.js`.

---

## 9. Milestones & Deliverables

### Milestone 1 – Project Skeleton (1–2 days)

- NestJS app with:
  - TypeORM + Postgres configured
  - Bull + Redis configured
  - Health check endpoint
- Angular app with:
  - Basic routing
  - Placeholder upload page

**Deliverable:** Both apps run locally.

### Milestone 2 – Upload & Job Creation (1–2 days)

- `POST /api/documents/upload` implemented.
- Files stored on disk.
- `DocumentEntity` and `ExtractionJobEntity` created.
- Angular upload UI wired to endpoint.

**Deliverable:** User can upload a PDF and see a `jobId`.

### Milestone 3 – Worker + OLLAMA Markdown Extraction (3–4 days)

- Worker pulls jobs and:
  - Converts PDF pages to images.
  - Calls `extractMarkdownFromImage` per page.
  - Aggregates Markdown.
  - Saves `ExtractionResultEntity`.
  - Updates job status.
- `GET /api/jobs/:id` and `GET /api/results/:documentId` implemented.
- Angular document detail view showing Markdown.

**Deliverable:** End-to-end flow for Markdown extraction from PDFs.

### Milestone 4 – Structured Extraction (3–4 days)

- `SchemaConfigEntity` + simple seeder for `InvoiceSchemaV1`.
- `extractStructuredFromImage` and/or `extractStructuredFromText` implemented.
- `mode=structured` path in worker.
- Validate JSON; handle parse errors.
- Angular Structured View tab.

**Deliverable:** End-to-end structured invoice extraction.

### Milestone 5 – Polish & Hardening (2–3 days)

- File size + page count limits.
- User-friendly error messages for failed jobs.
- Basic UI styling.
- Logging around OLLAMA errors.
- README with setup steps.

**Deliverable:** Production-ready MVP.

---

## 10. Environment & Run Instructions (for Coding Agent)

### 10.1 Prerequisites

- Node.js 20+
- Docker (optional but recommended)
- Postgres instance
- Redis instance
- OLLAMA installed and running locally
- At least one vision model pulled, e.g.:

```bash
ollama pull llama3.2-vision
# or structured extractor
ollama pull nuextract
```

### 10.2 Backend

```bash
cd doc-extract-api
cp .env.example .env   # fill DB, Redis, OLLAMA vars
npm install
npm run start:dev
```

### 10.3 Frontend

```bash
cd doc-extract-web
npm install
ng serve --open
```

---

## 11. Notes & Priorities

1. **First priority**: Get Markdown extraction working reliably for single-page PDFs.
2. **Second priority**: Extend to multi-page PDFs.
3. **Third priority**: Implement structured extraction for invoices.
4. Use conservative `temperature` for structured extraction (0.0–0.2) to reduce hallucinations.
5. Design everything so that adding a new schema (e.g. `ReceiptSchemaV1`) is just DB seeding + prompt template change.

Once this MVP is solid, we can later add:
- Authentication & per-user history
- Bulk upload (multiple PDFs at once)
- Export to CSV/Excel
- Extra schemas (forms, contracts, medical reports, etc.)
