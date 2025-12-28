import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ExtractionProcessor } from './extraction.processor';
import { ExtractionService } from './extraction.service';
import { ExtractionJobEntity } from './entities/extraction-job.entity';
import { ExtractionResultEntity } from './entities/extraction-result.entity';
import { SchemaConfigEntity } from './entities/schema-config.entity';
import { DocumentEntity } from '../documents/entities/document.entity';
import { OllamaModule } from '../ollama/ollama.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            ExtractionJobEntity,
            ExtractionResultEntity,
            SchemaConfigEntity,
            DocumentEntity,
        ]),
        BullModule.registerQueue({
            name: 'extraction',
        }),
        OllamaModule,
    ],
    providers: [ExtractionProcessor, ExtractionService],
    exports: [ExtractionService],
})
export class ExtractionModule { }
