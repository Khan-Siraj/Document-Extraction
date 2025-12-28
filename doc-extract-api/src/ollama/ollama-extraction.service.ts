import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { SchemaConfigEntity } from '../extraction/entities/schema-config.entity';

@Injectable()
export class OllamaExtractionService {
    private readonly logger = new Logger(OllamaExtractionService.name);
    private readonly baseUrl: string;
    private readonly visionModel: string;
    private readonly structModel: string;

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
    ) {
        this.baseUrl = this.configService.get<string>('OLLAMA_BASE_URL', 'http://localhost:11434');
        this.visionModel = this.configService.get<string>('VISION_MODEL', 'llama3.2-vision');
        this.structModel = this.configService.get<string>('STRUCT_MODEL', 'nuextract');
    }

    async extractMarkdownFromText(text: string): Promise<string> {
        this.logger.log(`Converting text to clean Markdown using ${this.visionModel}`);

        const prompt = `You are a document parsing assistant. Convert the following document text into clean Markdown format.
- Preserve headings, paragraphs, lists, and tables.
- Structure the content logically.
- Do not omit any information.
- Return only Markdown, no explanations.

Document Text:
${text}`;

        const body = {
            model: this.visionModel,
            messages: [
                {
                    role: 'user',
                    content: prompt,
                },
            ],
            stream: false,
            options: {
                temperature: 0.1,
                num_predict: 4096,
            },
        };

        try {
            const url = `${this.baseUrl}/api/chat`;
            this.logger.log(`Calling OLLAMA at ${url} with model ${this.visionModel}`);

            const response = await firstValueFrom(
                this.httpService.post(url, body, {
                    timeout: 120000,
                }),
            );

            return response.data.message.content;
        } catch (error) {
            this.logger.error(`OLLAMA extraction failed at ${this.baseUrl}/api/chat with model ${this.visionModel}`);
            this.logger.error(`Error: ${error.message}`);

            if (error.response) {
                this.logger.error(`OLLAMA Response Status: ${error.response.status}`);
                this.logger.error(`OLLAMA Response Data: ${JSON.stringify(error.response.data)}`);
            }

            // Fallback: return raw text if OLLAMA is unavailable
            this.logger.warn('Falling back to raw text (OLLAMA unavailable)');
            return text;
        }
    }

    async extractStructuredFromText(
        text: string,
        schema: SchemaConfigEntity,
    ): Promise<any> {
        this.logger.log(`Extracting structured data from text using ${this.structModel}`);

        const schemaJson = JSON.stringify(schema.jsonSchema, null, 2);

        const prompt = `${schema.promptTemplate}

You will extract data from a document and return it as JSON that conforms to this schema:

${schemaJson}

IMPORTANT: Do NOT return the schema itself. Extract the ACTUAL DATA VALUES from the document below.

Document Text:
${text}

EXTRACTION INSTRUCTIONS:
1. Read the document text carefully
2. Extract the actual values for each field in the schema
3. For arrays (like lineItems), extract all items you find in the document
4. Use null for fields that are not present in the document
5. Do not add any fields that are not in the schema
6. Return ONLY the JSON object with extracted values - no explanations, no markdown formatting

Example of correct output format for an invoice:
{
  "invoiceNumber": "INV-12345",
  "invoiceDate": "2024-01-15",
  "vendorName": "ABC Corp",
  "lineItems": [
    {"description": "Widget A", "quantity": 2, "unitPrice": 50.00, "amount": 100.00}
  ],
  "subtotal": 100.00,
  "tax": 10.00,
  "total": 110.00,
  "currency": "USD"
}

Now extract the data from the provided document:`;

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
                num_predict: 2048,
            },
        };

        try {
            const url = `${this.baseUrl}/api/chat`;
            this.logger.log(`Calling OLLAMA at ${url} with model ${this.structModel}`);

            const response = await firstValueFrom(
                this.httpService.post(url, body, {
                    timeout: 120000,
                }),
            );

            const responseText = response.data.message.content;
            this.logger.log(`Raw OLLAMA response: ${responseText.substring(0, 200)}...`);

            // Try to extract JSON from various formats
            let jsonStr = responseText.trim();

            // Remove markdown code blocks if present
            const codeBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (codeBlockMatch) {
                jsonStr = codeBlockMatch[1].trim();
                this.logger.log('Extracted JSON from markdown code block');
            }

            // Remove any leading/trailing text that's not part of JSON
            const jsonObjectMatch = jsonStr.match(/\{[\s\S]*\}/);
            if (jsonObjectMatch) {
                jsonStr = jsonObjectMatch[0];
            }

            try {
                const parsedJson = JSON.parse(jsonStr);
                this.logger.log('Successfully parsed structured JSON');
                return parsedJson;
            } catch (parseError) {
                this.logger.error('Failed to parse JSON response');
                this.logger.error(`JSON string: ${jsonStr}`);
                throw new Error(`Invalid JSON response from OLLAMA: ${parseError.message}`);
            }
        } catch (error) {
            this.logger.error(`OLLAMA structured extraction failed at ${this.baseUrl}/api/chat with model ${this.structModel}`);
            this.logger.error(`Error: ${error.message}`);

            if (error.response) {
                this.logger.error(`OLLAMA Response Status: ${error.response.status}`);
                this.logger.error(`OLLAMA Response Data: ${JSON.stringify(error.response.data)}`);
            }

            // Fallback: return basic structure
            this.logger.warn('Falling back to placeholder JSON (OLLAMA unavailable)');
            return {
                extractedText: text.substring(0, 500) + '...',
                note: 'OLLAMA unavailable - showing raw text preview',
                fullText: text
            };
        }
    }
}
