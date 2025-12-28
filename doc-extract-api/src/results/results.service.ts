import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExtractionResultEntity } from '../extraction/entities/extraction-result.entity';
import { ExtractionJobEntity } from '../extraction/entities/extraction-job.entity';

@Injectable()
export class ResultsService {
    constructor(
        @InjectRepository(ExtractionResultEntity)
        private readonly resultRepo: Repository<ExtractionResultEntity>,
        @InjectRepository(ExtractionJobEntity)
        private readonly jobRepo: Repository<ExtractionJobEntity>,
    ) { }

    async findJobById(id: string): Promise<ExtractionJobEntity | null> {
        return this.jobRepo.findOne({
            where: { id },
            relations: ['document'],
        });
    }

    async findResultByDocumentId(
        documentId: string,
    ): Promise<ExtractionResultEntity | null> {
        return this.resultRepo.findOne({
            where: { documentId },
            relations: ['job', 'document'],
        });
    }
}
