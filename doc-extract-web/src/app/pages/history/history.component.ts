import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService, Document } from '../../services/api.service';

@Component({
    selector: 'app-history',
    standalone: true,
    imports: [CommonModule, RouterLink],
    template: `
    <div class="history-container">
      <div class="history-header">
        <h1>📂 Document History</h1>
        <a routerLink="/upload" class="upload-btn">+ Upload New</a>
      </div>

      @if (isLoading()) {
        <div class="loading">
          <div class="spinner"></div>
          <p>Loading documents...</p>
        </div>
      } @else if (documents().length === 0) {
        <div class="empty-state">
          <span class="empty-icon">📭</span>
          <p>No documents yet</p>
          <a routerLink="/upload" class="cta-btn">Upload Your First Document</a>
        </div>
      } @else {
        <div class="documents-grid">
          @for (doc of documents(); track doc.id) {
            <a [routerLink]="['/documents', doc.id]" class="document-card">
              <div class="doc-icon">📄</div>
              <div class="doc-info">
                <h3>{{ doc.originalFileName }}</h3>
                <div class="doc-meta">
                  <span class="doc-type">{{ doc.type | titlecase }}</span>
                  <span class="doc-date">{{ doc.createdAt | date:'short' }}</span>
                </div>
              </div>
              <div class="doc-arrow">→</div>
            </a>
          }
        </div>
      }
    </div>
  `,
    styles: [`
    .history-container {
      max-width: 900px;
      margin: 0 auto;
    }

    .history-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
    }

    h1 {
      margin: 0;
      font-size: 2rem;
      color: #333;
    }

    .upload-btn, .cta-btn {
      padding: 0.75rem 1.5rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-decoration: none;
      border-radius: 10px;
      font-weight: 600;
      transition: all 0.3s ease;
    }

    .upload-btn:hover, .cta-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
    }

    .loading, .empty-state {
      text-align: center;
      padding: 4rem;
      background: white;
      border-radius: 20px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
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

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .empty-icon {
      font-size: 4rem;
      display: block;
      margin-bottom: 1rem;
    }

    .empty-state p {
      color: #666;
      margin-bottom: 1.5rem;
    }

    .documents-grid {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .document-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1.5rem;
      background: white;
      border-radius: 16px;
      text-decoration: none;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
      transition: all 0.3s ease;
    }

    .document-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
    }

    .doc-icon {
      font-size: 2.5rem;
    }

    .doc-info {
      flex: 1;
    }

    .doc-info h3 {
      margin: 0 0 0.5rem;
      color: #333;
      font-size: 1.125rem;
    }

    .doc-meta {
      display: flex;
      gap: 1rem;
      color: #999;
      font-size: 0.875rem;
    }

    .doc-type {
      padding: 0.25rem 0.75rem;
      background: #f1f5f9;
      border-radius: 20px;
      color: #64748b;
    }

    .doc-arrow {
      font-size: 1.5rem;
      color: #ccc;
      transition: all 0.3s ease;
    }

    .document-card:hover .doc-arrow {
      color: #667eea;
      transform: translateX(4px);
    }
  `]
})
export class HistoryComponent implements OnInit {
    documents = signal<Document[]>([]);
    isLoading = signal(true);

    constructor(private apiService: ApiService) { }

    ngOnInit() {
        this.loadDocuments();
    }

    private loadDocuments() {
        this.apiService.getDocuments().subscribe({
            next: (response) => {
                this.documents.set(response.documents);
                this.isLoading.set(false);
            },
            error: (error) => {
                console.error('Failed to load documents:', error);
                this.isLoading.set(false);
            }
        });
    }
}
