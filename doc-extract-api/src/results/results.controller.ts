import {
    Controller,
    Get,
    Param,
    Res,
    NotFoundException,
} from '@nestjs/common';
import type { Response } from 'express';
import { ResultsService } from './results.service';

@Controller('api')
export class ResultsController {
    constructor(private readonly resultsService: ResultsService) { }

    @Get('jobs/:id')
    async getJobStatus(@Param('id') id: string) {
        const job = await this.resultsService.findJobById(id);
        if (!job) {
            throw new NotFoundException('Job not found');
        }

        return {
            id: job.id,
            documentId: job.documentId,
            status: job.status,
            mode: job.mode,
            schemaName: job.schemaName,
            errorMessage: job.errorMessage,
            createdAt: job.createdAt,
            startedAt: job.startedAt,
            completedAt: job.completedAt,
        };
    }

    @Get('results/:documentId')
    async getResult(@Param('documentId') documentId: string) {
        const result = await this.resultsService.findResultByDocumentId(documentId);
        if (!result) {
            throw new NotFoundException('Result not found');
        }

        return {
            id: result.id,
            documentId: result.documentId,
            jobId: result.jobId,
            rawText: result.rawText,
            structuredJson: result.structuredJson,
            modelUsed: result.modelUsed,
            perPageMetadata: result.perPageMetadata,
            document: result.document,
        };
    }

    @Get('results/:documentId/export/json')
    async exportJson(
        @Param('documentId') documentId: string,
        @Res() res: Response,
    ) {
        const result = await this.resultsService.findResultByDocumentId(documentId);
        if (!result) {
            throw new NotFoundException('Result not found');
        }

        const exportData = {
            documentId: result.documentId,
            originalFileName: result.document?.originalFileName,
            extractedAt: result.job?.completedAt,
            modelUsed: result.modelUsed,
            rawText: result.rawText,
            structuredJson: result.structuredJson,
        };

        res.setHeader('Content-Type', 'application/json');
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="extraction-${documentId}.json"`,
        );
        res.send(JSON.stringify(exportData, null, 2));
    }
}
