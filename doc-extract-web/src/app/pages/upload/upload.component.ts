import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
    selector: 'app-upload',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="upload-container">
      <div class="upload-card">
        <h1>📄 Upload Document</h1>
        <p class="subtitle">Extract data from PDFs using AI</p>

        <div 
          class="drop-zone" 
          [class.dragging]="isDragging()"
          [class.has-file]="selectedFile()"
          (dragover)="onDragOver($event)"
          (dragleave)="onDragLeave()"
          (drop)="onDrop($event)"
          (click)="fileInput.click()">
          
          @if (selectedFile()) {
            <div class="file-preview">
              <span class="file-icon">📑</span>
              <span class="file-name">{{ selectedFile()?.name }}</span>
              <span class="file-size">{{ formatFileSize(selectedFile()!.size) }}</span>
            </div>
          } @else {
            <div class="drop-prompt">
              <span class="upload-icon">⬆️</span>
              <p>Drop your PDF here or click to browse</p>
              <span class="hint">Supports PDF files up to 20MB</span>
            </div>
          }
        </div>
        <input 
          #fileInput 
          type="file" 
          accept="application/pdf" 
          hidden 
          (change)="onFileSelected($event)" />

        <div class="options">
          <div class="option-group">
            <label>Document Type</label>
            <select [(ngModel)]="documentType">
              <option value="generic">Generic</option>
              <option value="invoice">Invoice</option>
              <option value="receipt">Receipt</option>
              <option value="form">Form</option>
              <option value="contract">Contract</option>
            </select>
          </div>

          <div class="option-group">
            <label>Extraction Mode</label>
            <select [(ngModel)]="extractionMode">
              <option value="markdown">Markdown (Raw Text)</option>
              <option value="structured">Structured (JSON)</option>
            </select>
          </div>

          @if (extractionMode === 'structured') {
            <div class="option-group">
              <label>Schema</label>
              <select [(ngModel)]="schemaName">
                <option value="InvoiceSchemaV1">Invoice Schema V1</option>
              </select>
            </div>
          }
        </div>

        <button 
          class="upload-btn" 
          [disabled]="!selectedFile() || isUploading()"
          (click)="upload()">
          @if (isUploading()) {
            <span class="spinner"></span> Uploading...
          } @else {
            🚀 Start Extraction
          }
        </button>

        @if (errorMessage()) {
          <div class="error-message">{{ errorMessage() }}</div>
        }
      </div>
    </div>
  `,
    styles: [`
    .upload-container {
      display: flex;
      justify-content: center;
      align-items: flex-start;
      padding: 2rem;
    }

    .upload-card {
      background: white;
      border-radius: 20px;
      padding: 3rem;
      width: 100%;
      max-width: 600px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
    }

    h1 {
      margin: 0 0 0.5rem;
      font-size: 2rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .subtitle {
      color: #666;
      margin-bottom: 2rem;
    }

    .drop-zone {
      border: 2px dashed #ddd;
      border-radius: 16px;
      padding: 3rem 2rem;
      text-align: center;
      cursor: pointer;
      transition: all 0.3s ease;
      background: #fafafa;
    }

    .drop-zone:hover,
    .drop-zone.dragging {
      border-color: #667eea;
      background: rgba(102, 126, 234, 0.05);
    }

    .drop-zone.has-file {
      border-color: #10b981;
      border-style: solid;
      background: rgba(16, 185, 129, 0.05);
    }

    .drop-prompt {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
    }

    .upload-icon {
      font-size: 3rem;
    }

    .drop-prompt p {
      color: #333;
      font-weight: 500;
      margin: 0;
    }

    .hint {
      color: #999;
      font-size: 0.875rem;
    }

    .file-preview {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .file-icon {
      font-size: 2rem;
    }

    .file-name {
      font-weight: 600;
      color: #333;
    }

    .file-size {
      color: #999;
      font-size: 0.875rem;
    }

    .options {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      margin: 2rem 0;
    }

    .option-group {
      flex: 1;
      min-width: 150px;
    }

    .option-group label {
      display: block;
      font-weight: 500;
      margin-bottom: 0.5rem;
      color: #333;
    }

    .option-group select {
      width: 100%;
      padding: 0.75rem 1rem;
      border: 2px solid #eee;
      border-radius: 10px;
      font-size: 1rem;
      background: white;
      transition: all 0.3s ease;
    }

    .option-group select:focus {
      outline: none;
      border-color: #667eea;
    }

    .upload-btn {
      width: 100%;
      padding: 1rem 2rem;
      font-size: 1.125rem;
      font-weight: 600;
      color: white;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }

    .upload-btn:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
    }

    .upload-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .spinner {
      width: 20px;
      height: 20px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .error-message {
      margin-top: 1rem;
      padding: 1rem;
      background: #fee2e2;
      color: #dc2626;
      border-radius: 10px;
      text-align: center;
    }
  `]
})
export class UploadComponent {
    selectedFile = signal<File | null>(null);
    isDragging = signal(false);
    isUploading = signal(false);
    errorMessage = signal<string | null>(null);

    documentType = 'generic';
    extractionMode = 'markdown';
    schemaName = 'InvoiceSchemaV1';

    constructor(
        private apiService: ApiService,
        private router: Router
    ) { }

    onDragOver(event: DragEvent) {
        event.preventDefault();
        this.isDragging.set(true);
    }

    onDragLeave() {
        this.isDragging.set(false);
    }

    onDrop(event: DragEvent) {
        event.preventDefault();
        this.isDragging.set(false);

        const files = event.dataTransfer?.files;
        if (files && files.length > 0) {
            const file = files[0];
            if (file.type === 'application/pdf') {
                this.selectedFile.set(file);
                this.errorMessage.set(null);
            } else {
                this.errorMessage.set('Please select a PDF file');
            }
        }
    }

    onFileSelected(event: Event) {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files.length > 0) {
            const file = input.files[0];
            if (file.type === 'application/pdf') {
                this.selectedFile.set(file);
                this.errorMessage.set(null);
            } else {
                this.errorMessage.set('Please select a PDF file');
            }
        }
    }

    formatFileSize(bytes: number): string {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    upload() {
        const file = this.selectedFile();
        if (!file) return;

        this.isUploading.set(true);
        this.errorMessage.set(null);

        const schemaName = this.extractionMode === 'structured' ? this.schemaName : undefined;

        this.apiService.uploadDocument(
            file,
            this.documentType,
            this.extractionMode,
            schemaName
        ).subscribe({
            next: (response) => {
                this.isUploading.set(false);
                this.router.navigate(['/documents', response.documentId], {
                    queryParams: { jobId: response.jobId }
                });
            },
            error: (error) => {
                this.isUploading.set(false);
                this.errorMessage.set(error.error?.message || 'Upload failed. Please try again.');
            }
        });
    }
}
