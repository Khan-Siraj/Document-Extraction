import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
} from 'typeorm';

export type DocumentType = 'invoice' | 'receipt' | 'form' | 'contract' | 'generic';

@Entity('documents')
export class DocumentEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    originalFileName: string;

    @Column()
    storedPath: string;

    @Column()
    mimeType: string;

    @Column({ nullable: true })
    pageCount: number;

    @Column({ default: 'generic' })
    type: DocumentType;

    @CreateDateColumn()
    createdAt: Date;
}
