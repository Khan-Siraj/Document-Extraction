import {
    Controller,
    Post,
    Get,
    Param,
    UseInterceptors,
    UploadedFile,
    Body,
    BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentsService, UploadOptions } from './documents.service';
import type { DocumentType } from './entities/document.entity';
import type { ExtractionMode } from '../extraction/entities/extraction-job.entity';

@Controller('api/documents')
export class DocumentsController {
    constructor(private readonly documentsService: DocumentsService) { }

    @Post('upload')
    @UseInterceptors(FileInterceptor('file'))
    async uploadDocument(
        @UploadedFile() file: Express.Multer.File,
        @Body('type') type?: DocumentType,
        @Body('mode') mode?: ExtractionMode,
        @Body('schemaName') schemaName?: string,
    ) {
        if (!file) {
            throw new BadRequestException('File is required');
        }

        if (file.mimetype !== 'application/pdf') {
            throw new BadRequestException('Only PDF files are allowed');
        }

        const options: UploadOptions = {
            type,
            mode,
            schemaName,
        };

        const result = await this.documentsService.uploadDocument(file, options);

        return {
            success: true,
            documentId: result.document.id,
            jobId: result.job.id,
            message: 'Document uploaded and queued for extraction',
        };
    }

    @Get()
    async findAll() {
        const documents = await this.documentsService.findAll();
        return { documents };
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        const document = await this.documentsService.findById(id);
        if (!document) {
            throw new BadRequestException('Document not found');
        }
        return { document };
    }
}
