import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { DocumentEntity } from '../../documents/entities/document.entity';

export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed';
export type ExtractionMode = 'markdown' | 'structured';

@Entity('extraction_jobs')
export class ExtractionJobEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    documentId: string;

    @ManyToOne(() => DocumentEntity)
    @JoinColumn({ name: 'documentId' })
    document: DocumentEntity;

    @Column({ default: 'queued' })
    status: JobStatus;

    @Column({ default: 'markdown' })
    mode: ExtractionMode;

    @Column({ nullable: true })
    schemaName: string;

    @Column({ nullable: true, type: 'text' })
    errorMessage: string;

    @CreateDateColumn()
    createdAt: Date;

    @Column({ type: 'timestamp', nullable: true })
    startedAt: Date | null;

    @Column({ type: 'timestamp', nullable: true })
    completedAt: Date | null;
}
