import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('schema_configs')
export class SchemaConfigEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    name: string;

    @Column({ type: 'jsonb' })
    jsonSchema: any;

    @Column({ type: 'text' })
    promptTemplate: string;
}
