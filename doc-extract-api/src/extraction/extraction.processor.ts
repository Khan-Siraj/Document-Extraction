import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { ExtractionService } from './extraction.service';
import { OllamaExtractionService } from '../ollama/ollama-extraction.service';

@Processor('extraction')
export class ExtractionProcessor {
    private readonly logger = new Logger(ExtractionProcessor.name);
    private readonly uploadDir: string;

    constructor(
        private readonly extractionService: ExtractionService,
        private readonly ollamaService: OllamaExtractionService,
        private readonly configService: ConfigService,
    ) {
        this.uploadDir = this.configService.get<string>('UPLOAD_DIR', './uploads');
    }

    @Process()
    async handleExtraction(job: Job<{ jobId: string }>) {
        const { jobId } = job.data;
        this.logger.log(`Processing extraction job: ${jobId}`);

        try {
            // Get the job
            const extractionJob = await this.extractionService.findJobById(jobId);
            if (!extractionJob) {
                throw new Error(`Job not found: ${jobId}`);
            }

            // Update status to processing
            await this.extractionService.updateJobStatus(jobId, 'processing');

            const pdfPath = extractionJob.document.storedPath;

            // Check if file exists
            if (!fs.existsSync(pdfPath)) {
                throw new Error(`PDF file not found: ${pdfPath}`);
            }

            // Extract text from PDF using pdf-parse v1.1.1
            const pdfBuffer = fs.readFileSync(pdfPath);
            const pdf = require('pdf-parse');
            const pdfData = await pdf(pdfBuffer);
            const extractedText = pdfData.text;
            const pageCount = pdfData.numpages;

            this.logger.log(`Extracted text from ${pageCount} pages`);

            let modelUsed = '';

            if (extractionJob.mode === 'markdown') {
                // Use OLLAMA to convert raw text to clean Markdown
                const rawText = await this.ollamaService.extractMarkdownFromText(extractedText);
                modelUsed = this.configService.get<string>('VISION_MODEL', 'llama3.2-vision');

                // Save result
                await this.extractionService.saveResult(
                    jobId,
                    extractionJob.documentId,
                    rawText,
                    undefined,
                    modelUsed,
                    { pageCount },
                );
            } else if (extractionJob.mode === 'structured') {
                // Structured extraction
                const schema = await this.extractionService.findSchemaByName(
                    extractionJob.schemaName || 'InvoiceSchemaV1',
                );

                if (!schema) {
                    throw new Error(`Schema not found: ${extractionJob.schemaName}`);
                }

                // Use text-based extraction
                const structuredJson = await this.ollamaService.extractStructuredFromText(
                    extractedText,
                    schema,
                );
                modelUsed = this.configService.get<string>('STRUCT_MODEL', 'nuextract');

                // Save result
                await this.extractionService.saveResult(
                    jobId,
                    extractionJob.documentId,
                    undefined,
                    structuredJson,
                    modelUsed,
                    { pageCount },
                );
            }

            // Update job status to completed
            await this.extractionService.updateJobStatus(jobId, 'completed');
            this.logger.log(`Job completed: ${jobId}`);
        } catch (error) {
            this.logger.error(`Job failed: ${jobId}`, error);
            await this.extractionService.updateJobStatus(
                jobId,
                'failed',
                error instanceof Error ? error.message : 'Unknown error',
            );
        }
    }
}
