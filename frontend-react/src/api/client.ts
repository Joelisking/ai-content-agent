import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface Brand {
  _id: string;
  name: string;
  industry: string;
  voiceTone: string[];
  targetAudience: string;
  keyMessages: string[];
  doNotMention: string[];
  approverEmails: string[];
  createdAt: string;
  updatedAt: string;
}

export interface MediaUpload {
  _id: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  path: string;
  uploadedAt: string;
  metadata?: {
    description?: string;
    tags?: string[];
  };
}

export interface Content {
  _id: string;
  platform: 'linkedin' | 'instagram' | 'twitter' | 'facebook';
  content: {
    text: string;
    hashtags?: string[];
    mediaIds?: string[] | MediaUpload[];
  };
  status:
    | 'pending'
    | 'approved'
    | 'rejected'
    | 'posted'
    | 'scheduled';
  brandConfigId: string;
  generatedBy: 'ai' | 'manual';
  scheduledFor?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  postedAt?: string;
  postUrl?: string;
  metadata: {
    version: number;
    previousVersions?: any[];
    aiMetadata?: {
      model: string;
      temperature: number;
      promptTokens: number;
      completionTokens: number;
    };
  };
  createdAt: string;
  updatedAt: string;
  reasoning?: string;
}

export interface SystemControl {
  _id: string;
  mode: 'active' | 'paused' | 'manual-only' | 'crisis';
  lastChangedBy: string;
  lastChangedAt: string;
  reason?: string;
  settings: {
    autoPostingEnabled: boolean;
    requireApprovalForAll: boolean;
    maxDailyPosts: number;
  };
}

export interface DashboardStats {
  content: {
    total: number;
    pending: number;
    approved: number;
    posted: number;
  };
  media: {
    total: number;
  };
  system: {
    mode: string;
    autoPostingEnabled: boolean;
  };
}

export const apiClient = {
  // Brand
  getBrands: () => api.get<Brand[]>('/brand'),
  getBrand: (id: string) => api.get<Brand>(`/brand/${id}`),
  createBrand: (data: Partial<Brand>) =>
    api.post<Brand>('/brand', data),
  updateBrand: (id: string, data: Partial<Brand>) =>
    api.put<Brand>(`/brand/${id}`, data),

  // Media
  uploadMedia: (formData: FormData) =>
    api.post<MediaUpload>('/media/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getMedia: () => api.get<MediaUpload[]>('/media'),
  getMediaById: (id: string) => api.get<MediaUpload>(`/media/${id}`),
  deleteMedia: (id: string) => api.delete(`/media/${id}`),

  // Content
  generateContent: (data: {
    brandConfigId: string;
    platform: string;
    mediaIds?: string[];
    userPrompt?: string;
  }) => api.post<Content>('/content/generate', data),

  regenerateContent: (
    id: string,
    feedback: string,
    performedBy?: string,
    platform?: string,
  ) =>
    api.post<Content>(`/content/${id}/regenerate`, {
      feedback,
      performedBy,
      platform,
    }),

  getContent: (params?: { status?: string; platform?: string }) =>
    api.get<Content[]>('/content', { params }),

  getContentById: (id: string) => api.get<Content>(`/content/${id}`),

  approveContent: (
    id: string,
    approvedBy: string,
    scheduledFor?: string,
  ) =>
    api.post<Content>(`/content/${id}/approve`, {
      approvedBy,
      scheduledFor,
    }),

  rejectContent: (id: string, rejectedBy: string, reason: string) =>
    api.post<Content>(`/content/${id}/reject`, {
      rejectedBy,
      reason,
    }),

  postContent: (id: string, performedBy: string) =>
    api.post(`/content/${id}/post`, { performedBy }),

  // System Control
  getSystemControl: () => api.get<SystemControl>('/system/control'),
  updateSystemControl: (data: {
    mode: string;
    changedBy: string;
    reason?: string;
    settings?: any;
  }) => api.post<SystemControl>('/system/control', data),

  // Dashboard
  getDashboardStats: () =>
    api.get<DashboardStats>('/dashboard/stats'),
  getAuditLogs: (limit?: number) =>
    api.get('/audit', { params: { limit } }),
  getPostingStats: (days?: number) =>
    api.get('/posting/stats', { params: { days } }),
};

export default api;
