import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Document {
    id: string;
    originalFileName: string;
    storedPath: string;
    mimeType: string;
    pageCount: number;
    type: string;
    createdAt: string;
}

export interface Job {
    id: string;
    documentId: string;
    status: 'queued' | 'processing' | 'completed' | 'failed';
    mode: 'markdown' | 'structured';
    schemaName?: string;
    errorMessage?: string;
    createdAt: string;
    startedAt?: string;
    completedAt?: string;
}

export interface ExtractionResult {
    id: string;
    documentId: string;
    jobId: string;
    rawText?: string;
    structuredJson?: any;
    modelUsed: string;
    perPageMetadata?: any;
    document?: Document;
}

export interface UploadResponse {
    success: boolean;
    documentId: string;
    jobId: string;
    message: string;
}

@Injectable({
    providedIn: 'root'
})
export class ApiService {
    private readonly baseUrl = 'http://localhost:3000/api';

    constructor(private http: HttpClient) { }

    uploadDocument(
        file: File,
        type: string = 'generic',
        mode: string = 'markdown',
        schemaName?: string
    ): Observable<UploadResponse> {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', type);
        formData.append('mode', mode);
        if (schemaName) {
            formData.append('schemaName', schemaName);
        }
        return this.http.post<UploadResponse>(`${this.baseUrl}/documents/upload`, formData);
    }

    getDocuments(): Observable<{ documents: Document[] }> {
        return this.http.get<{ documents: Document[] }>(`${this.baseUrl}/documents`);
    }

    getDocument(id: string): Observable<{ document: Document }> {
        return this.http.get<{ document: Document }>(`${this.baseUrl}/documents/${id}`);
    }

    getJob(id: string): Observable<Job> {
        return this.http.get<Job>(`${this.baseUrl}/jobs/${id}`);
    }

    getResult(documentId: string): Observable<ExtractionResult> {
        return this.http.get<ExtractionResult>(`${this.baseUrl}/results/${documentId}`);
    }

    getExportUrl(documentId: string): string {
        return `${this.baseUrl}/results/${documentId}/export/json`;
    }
}
