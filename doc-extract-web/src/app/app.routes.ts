import { Routes } from '@angular/router';

export const routes: Routes = [
    { path: '', redirectTo: 'upload', pathMatch: 'full' },
    {
        path: 'upload',
        loadComponent: () => import('./pages/upload/upload.component').then(m => m.UploadComponent)
    },
    {
        path: 'documents/:id',
        loadComponent: () => import('./pages/document-detail/document-detail.component').then(m => m.DocumentDetailComponent)
    },
    {
        path: 'history',
        loadComponent: () => import('./pages/history/history.component').then(m => m.HistoryComponent)
    },
];
