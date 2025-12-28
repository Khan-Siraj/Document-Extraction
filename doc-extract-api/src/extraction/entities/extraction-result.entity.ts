import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    OneToOne,
    JoinColumn,
} from 'typeorm';
import { ExtractionJobEntity } from './extraction-job.entity';
import { DocumentEntity } from '../../documents/entities/document.entity';

@Entity('extraction_results')
export class ExtractionResultEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    jobId: string;

    @OneToOne(() => ExtractionJobEntity)
    @JoinColumn({ name: 'jobId' })
    job: ExtractionJobEntity;

    @Column()
    documentId: string;

    @OneToOne(() => DocumentEntity)
    @JoinColumn({ name: 'documentId' })
    document: DocumentEntity;

    @Column({ type: 'text', nullable: true })
    rawText: string;

    @Column({ type: 'jsonb', nullable: true })
    structuredJson: any;

    @Column({ default: '' })
    modelUsed: string;

    @Column({ type: 'jsonb', nullable: true })
    perPageMetadata: any;
}
