import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { DocumentEntity } from './entities/document.entity';
import { ExtractionJobEntity } from '../extraction/entities/extraction-job.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([DocumentEntity, ExtractionJobEntity]),
        BullModule.registerQueue({
            name: 'extraction',
        }),
    ],
    controllers: [DocumentsController],
    providers: [DocumentsService],
    exports: [DocumentsService],
})
export class DocumentsModule { }
