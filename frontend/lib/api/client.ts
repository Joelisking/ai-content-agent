import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      typeof window !== 'undefined'
    ) {
      // Let the AuthContext handle the redirect if needed
    }
    return Promise.reject(error);
  },
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      typeof window !== 'undefined'
    ) {
      // Let the AuthContext handle the redirect if needed,
      // but essentially this indicates session is invalid.
      // We can also trigger diverse handling here.
    }
    return Promise.reject(error);
  },
);

export interface GenerationSchedule {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'custom';
  daysOfWeek: number[]; // 0-6, where 0=Sunday
  timesOfDay: string[]; // e.g., ['09:00', '15:00']
  platforms: ('linkedin' | 'instagram' | 'twitter' | 'facebook')[];
  autoGenerateImage: boolean;
  promptTemplate?: string;
}

export interface Brand {
  _id: string;
  name: string;
  industry: string;
  voiceTone: string[];
  targetAudience: string;
  keyMessages: string[];
  doNotMention: string[];
  approverEmails: string[];
  generationSchedule?: GenerationSchedule;
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
  generationStatus?: 'generating' | 'completed' | 'failed';
  generationError?: string;
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
    previousVersions?: Record<string, unknown>[];
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
    generateImage?: boolean;
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

  updateContent: (
    id: string,
    data: { text?: string; hashtags?: string[] },
  ) => api.put<Content>(`/content/${id}`, data),

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
    settings?: Record<string, unknown>;
  }) => api.post<SystemControl>('/system/control', data),

  // Dashboard
  getDashboardStats: () =>
    api.get<DashboardStats>('/dashboard/stats'),
  getAuditLogs: (limit?: number) =>
    api.get('/audit', { params: { limit } }),
  getPostingStats: (days?: number) =>
    api.get('/posting/stats', { params: { days } }),

  // Content Generation Schedules
  updateBrandSchedule: (id: string, schedule: GenerationSchedule) =>
    api.put<Brand>(`/brands/${id}/schedule`, {
      generationSchedule: schedule,
    }),
  getUpcomingSchedules: (hours?: number) =>
    api.get<
      Array<{
        brandId: string;
        brandName: string;
        platform: string;
        scheduledFor: string;
        time: string;
      }>
    >('/schedules/upcoming', { params: { hours } }),

  // Auth
  register: (
    email: string,
    password: string,
    name: string,
    secretKey?: string,
  ) =>
    api.post('/auth/register', { email, password, name, secretKey }),

  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),

  logout: () => api.post('/auth/logout'),

  getMe: () => api.get('/auth/me'),
};

export default api;
