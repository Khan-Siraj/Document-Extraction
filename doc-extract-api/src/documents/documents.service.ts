import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Repository } from 'typeorm';
import type { Queue } from 'bull';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { DocumentEntity, DocumentType } from './entities/document.entity';
import { ExtractionJobEntity, ExtractionMode } from '../extraction/entities/extraction-job.entity';

export interface UploadOptions {
    type?: DocumentType;
    mode?: ExtractionMode;
    schemaName?: string;
}

@Injectable()
export class DocumentsService {
    private readonly logger = new Logger(DocumentsService.name);
    private readonly uploadDir: string;

    constructor(
        @InjectRepository(DocumentEntity)
        private readonly documentRepo: Repository<DocumentEntity>,
        @InjectRepository(ExtractionJobEntity)
        private readonly jobRepo: Repository<ExtractionJobEntity>,
        @InjectQueue('extraction')
        private readonly extractionQueue: Queue,
        private readonly configService: ConfigService,
    ) {
        this.uploadDir = this.configService.get<string>('UPLOAD_DIR', './uploads');
        this.ensureUploadDir();
    }

    private ensureUploadDir(): void {
        if (!fs.existsSync(this.uploadDir)) {
            fs.mkdirSync(this.uploadDir, { recursive: true });
        }
    }

    async uploadDocument(
        file: Express.Multer.File,
        options: UploadOptions = {},
    ): Promise<{ document: DocumentEntity; job: ExtractionJobEntity }> {
        // Generate unique filename
        const fileExt = path.extname(file.originalname);
        const uniqueFileName = `${uuidv4()}${fileExt}`;
        const storedPath = path.join(this.uploadDir, uniqueFileName);

        // Save file to disk
        fs.writeFileSync(storedPath, file.buffer);

        // Create document entity
        const document = this.documentRepo.create({
            originalFileName: file.originalname,
            storedPath,
            mimeType: file.mimetype,
            type: options.type || 'generic',
        });
        await this.documentRepo.save(document);

        // Create extraction job
        const job = this.jobRepo.create({
            documentId: document.id,
            status: 'queued',
            mode: options.mode || 'markdown',
            schemaName: options.schemaName,
        });
        await this.jobRepo.save(job);

        // Add to queue
        await this.extractionQueue.add({
            jobId: job.id,
        });

        this.logger.log(`Document uploaded: ${document.id}, Job created: ${job.id}`);

        return { document, job };
    }

    async findById(id: string): Promise<DocumentEntity | null> {
        return this.documentRepo.findOne({ where: { id } });
    }

    async findAll(): Promise<DocumentEntity[]> {
        return this.documentRepo.find({
            order: { createdAt: 'DESC' },
        });
    }
}
