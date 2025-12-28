import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResultsController } from './results.controller';
import { ResultsService } from './results.service';
import { ExtractionResultEntity } from '../extraction/entities/extraction-result.entity';
import { ExtractionJobEntity } from '../extraction/entities/extraction-job.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([ExtractionResultEntity, ExtractionJobEntity]),
    ],
    controllers: [ResultsController],
    providers: [ResultsService],
})
export class ResultsModule { }
