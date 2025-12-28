import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExtractionJobEntity } from './entities/extraction-job.entity';
import { ExtractionResultEntity } from './entities/extraction-result.entity';
import { SchemaConfigEntity } from './entities/schema-config.entity';

@Injectable()
export class ExtractionService implements OnModuleInit {
    private readonly logger = new Logger(ExtractionService.name);

    constructor(
        @InjectRepository(ExtractionJobEntity)
        private readonly jobRepo: Repository<ExtractionJobEntity>,
        @InjectRepository(ExtractionResultEntity)
        private readonly resultRepo: Repository<ExtractionResultEntity>,
        @InjectRepository(SchemaConfigEntity)
        private readonly schemaRepo: Repository<SchemaConfigEntity>,
    ) { }

    async onModuleInit() {
        await this.seedDefaultSchemas();
    }

    async findJobById(id: string): Promise<ExtractionJobEntity | null> {
        return this.jobRepo.findOne({
            where: { id },
            relations: ['document'],
        });
    }

    async updateJobStatus(
        id: string,
        status: ExtractionJobEntity['status'],
        errorMessage?: string,
    ): Promise<void> {
        const updates: Partial<ExtractionJobEntity> = { status };

        if (status === 'processing') {
            updates.startedAt = new Date();
        } else if (status === 'completed' || status === 'failed') {
            updates.completedAt = new Date();
        }

        if (errorMessage) {
            updates.errorMessage = errorMessage;
        }

        await this.jobRepo.update(id, updates);
    }

    async saveResult(
        jobId: string,
        documentId: string,
        rawText?: string,
        structuredJson?: any,
        modelUsed?: string,
        perPageMetadata?: any,
    ): Promise<ExtractionResultEntity> {
        const result = this.resultRepo.create({
            jobId,
            documentId,
            rawText,
            structuredJson,
            modelUsed,
            perPageMetadata,
        });
        return this.resultRepo.save(result);
    }

    async findResultByDocumentId(
        documentId: string,
    ): Promise<ExtractionResultEntity | null> {
        return this.resultRepo.findOne({
            where: { documentId },
            relations: ['job', 'document'],
        });
    }

    async findSchemaByName(name: string): Promise<SchemaConfigEntity | null> {
        return this.schemaRepo.findOne({ where: { name } });
    }

    async seedDefaultSchemas(): Promise<void> {
        const invoiceSchema = await this.schemaRepo.findOne({
            where: { name: 'InvoiceSchemaV1' },
        });

        if (!invoiceSchema) {
            const schema = this.schemaRepo.create({
                name: 'InvoiceSchemaV1',
                jsonSchema: {
                    type: 'object',
                    properties: {
                        invoiceNumber: { type: 'string' },
                        invoiceDate: { type: 'string' },
                        dueDate: { type: 'string' },
                        vendorName: { type: 'string' },
                        vendorAddress: { type: 'string' },
                        customerName: { type: 'string' },
                        customerAddress: { type: 'string' },
                        lineItems: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    description: { type: 'string' },
                                    quantity: { type: 'number' },
                                    unitPrice: { type: 'number' },
                                    amount: { type: 'number' },
                                },
                            },
                        },
                        subtotal: { type: 'number' },
                        tax: { type: 'number' },
                        total: { type: 'number' },
                        currency: { type: 'string' },
                    },
                },
                promptTemplate: `You are an invoice data extraction assistant. Extract the following information from the invoice document and return it as valid JSON.`,
            });
            await this.schemaRepo.save(schema);
            this.logger.log('Default InvoiceSchemaV1 seeded');
        }
    }
}
