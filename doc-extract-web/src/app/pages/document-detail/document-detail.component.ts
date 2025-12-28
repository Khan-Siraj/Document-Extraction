import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService, Job, ExtractionResult, Document } from '../../services/api.service';
import { interval, Subscription } from 'rxjs';
import { switchMap, takeWhile } from 'rxjs/operators';

@Component({
    selector: 'app-document-detail',
    standalone: true,
    imports: [CommonModule, RouterLink],
    template: `
    <div class="detail-container">
      <div class="back-link">
        <a routerLink="/upload">← Upload New Document</a>
      </div>

      <div class="detail-card">
        <div class="header">
          <h1>📑 {{ document()?.originalFileName || 'Loading...' }}</h1>
          <div class="status-badge" [class]="job()?.status || 'queued'">
            {{ getStatusLabel() }}
          </div>
        </div>

        @if (job()?.status === 'processing' || job()?.status === 'queued') {
          <div class="processing-section">
            <div class="spinner large"></div>
            <p>Processing your document with AI...</p>
            <p class="hint">This may take a few minutes depending on the number of pages</p>
          </div>
        }

        @if (job()?.status === 'failed') {
          <div class="error-section">
            <span class="error-icon">❌</span>
            <p>Extraction failed</p>
            <p class="error-message">{{ job()?.errorMessage }}</p>
            <a routerLink="/upload" class="retry-btn">Try Again</a>
          </div>
        }

        @if (job()?.status === 'completed' && result()) {
          <div class="tabs">
            <button 
              [class.active]="activeTab() === 'structured'"
              (click)="activeTab.set('structured')"
              [disabled]="!result()?.structuredJson">
              📊 Structured JSON
            </button>
            <button 
              [class.active]="activeTab() === 'markdown'"
              (click)="activeTab.set('markdown')"
              [disabled]="!result()?.rawText">
              📝 Raw Markdown
            </button>
          </div>

          <div class="content-area">
            @if (activeTab() === 'structured' && result()?.structuredJson) {
              <pre class="json-view">{{ result()?.structuredJson | json }}</pre>
            }
            @if (activeTab() === 'markdown' && result()?.rawText) {
              <pre class="markdown-view">{{ result()?.rawText }}</pre>
            }
          </div>

          <div class="actions">
            <a [href]="getExportUrl()" target="_blank" class="download-btn">
              ⬇️ Download JSON
            </a>
          </div>

          <div class="metadata">
            <div class="meta-item">
              <span class="label">Model Used:</span>
              <span class="value">{{ result()?.modelUsed }}</span>
            </div>
            <div class="meta-item">
              <span class="label">Pages:</span>
              <span class="value">{{ result()?.perPageMetadata?.pageCount || 'N/A' }}</span>
            </div>
            <div class="meta-item">
              <span class="label">Completed:</span>
              <span class="value">{{ job()?.completedAt | date:'medium' }}</span>
            </div>
          </div>
        }
      </div>
    </div>
  `,
    styles: [`
    .detail-container {
      max-width: 900px;
      margin: 0 auto;
      padding: 1rem;
    }

    .back-link a {
      color: #667eea;
      text-decoration: none;
      font-weight: 500;
    }

    .detail-card {
      background: white;
      border-radius: 20px;
      padding: 2rem;
      margin-top: 1rem;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      flex-wrap: wrap;
      gap: 1rem;
    }

    h1 {
      margin: 0;
      font-size: 1.5rem;
      color: #333;
    }

    .status-badge {
      padding: 0.5rem 1rem;
      border-radius: 20px;
      font-weight: 600;
      font-size: 0.875rem;
    }

    .status-badge.queued {
      background: #fef3c7;
      color: #d97706;
    }

    .status-badge.processing {
      background: #dbeafe;
      color: #2563eb;
    }

    .status-badge.completed {
      background: #d1fae5;
      color: #059669;
    }

    .status-badge.failed {
      background: #fee2e2;
      color: #dc2626;
    }

    .processing-section {
      text-align: center;
      padding: 3rem;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid #eee;
      border-top-color: #667eea;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem;
    }

    .spinner.large {
      width: 60px;
      height: 60px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .hint {
      color: #999;
      font-size: 0.875rem;
    }

    .error-section {
      text-align: center;
      padding: 3rem;
    }

    .error-icon {
      font-size: 4rem;
    }

    .error-message {
      color: #dc2626;
      background: #fee2e2;
      padding: 1rem;
      border-radius: 10px;
      margin: 1rem 0;
    }

    .retry-btn {
      display: inline-block;
      padding: 0.75rem 1.5rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-decoration: none;
      border-radius: 10px;
      font-weight: 600;
    }

    .tabs {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }

    .tabs button {
      padding: 0.75rem 1.5rem;
      border: 2px solid #eee;
      background: white;
      border-radius: 10px;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.3s ease;
    }

    .tabs button:hover:not(:disabled) {
      border-color: #667eea;
    }

    .tabs button.active {
      border-color: #667eea;
      background: rgba(102, 126, 234, 0.1);
      color: #667eea;
    }

    .tabs button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .content-area {
      background: #1e1e2e;
      border-radius: 12px;
      padding: 1.5rem;
      overflow-x: auto;
      max-height: 500px;
      overflow-y: auto;
    }

    pre {
      margin: 0;
      color: #cdd6f4;
      font-family: 'Fira Code', monospace;
      font-size: 0.875rem;
      line-height: 1.6;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .actions {
      margin-top: 1.5rem;
      text-align: center;
    }

    .download-btn {
      display: inline-block;
      padding: 0.75rem 2rem;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      text-decoration: none;
      border-radius: 10px;
      font-weight: 600;
      transition: all 0.3s ease;
    }

    .download-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(16, 185, 129, 0.3);
    }

    .metadata {
      margin-top: 2rem;
      padding-top: 1.5rem;
      border-top: 1px solid #eee;
      display: flex;
      flex-wrap: wrap;
      gap: 2rem;
    }

    .meta-item {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .meta-item .label {
      font-size: 0.75rem;
      color: #999;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .meta-item .value {
      font-weight: 500;
      color: #333;
    }
  `]
})
export class DocumentDetailComponent implements OnInit, OnDestroy {
    document = signal<Document | null>(null);
    job = signal<Job | null>(null);
    result = signal<ExtractionResult | null>(null);
    activeTab = signal<'structured' | 'markdown'>('markdown');

    private pollSubscription?: Subscription;

    constructor(
        private route: ActivatedRoute,
        private apiService: ApiService
    ) { }

    ngOnInit() {
        const documentId = this.route.snapshot.paramMap.get('id');
        const jobId = this.route.snapshot.queryParamMap.get('jobId');

        if (documentId) {
            this.loadDocument(documentId);
        }

        if (jobId) {
            this.pollJobStatus(jobId, documentId!);
        }
    }

    ngOnDestroy() {
        this.pollSubscription?.unsubscribe();
    }

    private loadDocument(id: string) {
        this.apiService.getDocument(id).subscribe({
            next: (response) => {
                this.document.set(response.document);
            },
            error: (error) => {
                console.error('Failed to load document:', error);
            }
        });
    }

    private pollJobStatus(jobId: string, documentId: string) {
        this.apiService.getJob(jobId).subscribe({
            next: (job) => {
                this.job.set(job);

                if (job.status === 'queued' || job.status === 'processing') {
                    // Start polling
                    this.pollSubscription = interval(3000).pipe(
                        switchMap(() => this.apiService.getJob(jobId)),
                        takeWhile((j) => j.status === 'queued' || j.status === 'processing', true)
                    ).subscribe({
                        next: (j) => {
                            this.job.set(j);

                            if (j.status === 'completed') {
                                this.loadResult(documentId);
                            }
                        }
                    });
                } else if (job.status === 'completed') {
                    this.loadResult(documentId);
                }
            }
        });
    }

    private loadResult(documentId: string) {
        this.apiService.getResult(documentId).subscribe({
            next: (result) => {
                this.result.set(result);
                // Set active tab based on what's available
                if (result.structuredJson) {
                    this.activeTab.set('structured');
                } else if (result.rawText) {
                    this.activeTab.set('markdown');
                }
            },
            error: (error) => {
                console.error('Failed to load result:', error);
            }
        });
    }

    getStatusLabel(): string {
        const status = this.job()?.status;
        switch (status) {
            case 'queued': return '⏳ Queued';
            case 'processing': return '⚙️ Processing';
            case 'completed': return '✅ Completed';
            case 'failed': return '❌ Failed';
            default: return 'Loading...';
        }
    }

    getExportUrl(): string {
        const docId = this.document()?.id;
        return docId ? this.apiService.getExportUrl(docId) : '#';
    }
}
