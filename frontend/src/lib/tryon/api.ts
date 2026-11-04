// frontend/src/lib/tryon/api.ts
import { http } from '@/lib/api';

export interface TryOnJob {
  jobId: string;
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  resultImageUrl: string | null;
  error: string | null;
  createdAt: string;
  completedAt: string | null;
}

export async function startTryOn(personPhotoFile: File, productId: string): Promise<TryOnJob> {
  const form = new FormData();
  form.append('personPhoto', personPhotoFile);
  form.append('productId', productId);

  const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/tryon`, {
    method: 'POST',
    body: form,
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to start try-on');
  }
  return res.json();
}

export async function pollTryOnStatus(jobId: string): Promise<TryOnJob> {
  return http.get<TryOnJob>(`/api/tryon/status/${jobId}`);
}