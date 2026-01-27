import mongoose, { Document, Schema } from 'mongoose';

// Brand Configuration Model
export interface IGenerationSchedule {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'custom';
  daysOfWeek: number[]; // 0-6, where 0=Sunday, 1=Monday, etc.
  timesOfDay: string[]; // e.g., ['09:00', '15:00']
  platforms: ('linkedin' | 'instagram' | 'twitter' | 'facebook')[];
  autoGenerateImage: boolean;
  promptTemplate?: string; // Optional template for generation prompts
}

export interface IBrandConfig extends Document {
  name: string;
  industry: string;
  voiceTone: string[];
  targetAudience: string;
  keyMessages: string[];
  doNotMention: string[];
  approverEmails: string[];
  generationSchedule?: IGenerationSchedule;
  createdAt: Date;
  updatedAt: Date;
}

const BrandConfigSchema = new Schema<IBrandConfig>(
  {
    name: { type: String, required: true },
    industry: { type: String, required: true },
    voiceTone: [{ type: String }],
    targetAudience: { type: String, required: true },
    keyMessages: [{ type: String }],
    doNotMention: [{ type: String }],
    approverEmails: [{ type: String }],
    generationSchedule: {
      enabled: { type: Boolean, default: false },
      frequency: {
        type: String,
        enum: ['daily', 'weekly', 'custom'],
        default: 'daily',
      },
      daysOfWeek: [{ type: Number, min: 0, max: 6 }], // 0=Sunday, 6=Saturday
      timesOfDay: [{ type: String }], // e.g., ['09:00', '15:00']
      platforms: [
        {
          type: String,
          enum: ['linkedin', 'instagram', 'twitter', 'facebook'],
        },
      ],
      autoGenerateImage: { type: Boolean, default: false },
      promptTemplate: { type: String },
    },
  },
  { timestamps: true },
);

export const BrandConfig = mongoose.model<IBrandConfig>(
  'BrandConfig',
  BrandConfigSchema,
);

// Media Upload Model
export interface IMediaUpload extends Document {
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  path: string;
  uploadedAt: Date;
  brandId?: string;
  metadata?: {
    description?: string;
    tags?: string[];
  };
}

const MediaUploadSchema = new Schema<IMediaUpload>({
  filename: { type: String, required: true },
  originalName: { type: String, required: true },
  mimetype: { type: String, required: true },
  size: { type: Number, required: true },
  path: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now },
  brandId: { type: String }, // Optional linkage to a brand
  metadata: {
    description: String,
    tags: [String],
  },
});

export const MediaUpload = mongoose.model<IMediaUpload>(
  'MediaUpload',
  MediaUploadSchema,
);

// Content Queue Model
export type ContentStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'posted'
  | 'scheduled';
export type Platform =
  | 'linkedin'
  | 'instagram'
  | 'twitter'
  | 'facebook';
export type GenerationStatus = 'generating' | 'completed' | 'failed';

export interface IContentQueue extends Document {
  platform: Platform;
  content: {
    text: string;
    hashtags?: string[];
    mediaIds?: string[];
  };
  status: ContentStatus;
  generationStatus?: GenerationStatus;
  generationError?: string;
  brandConfigId: string;
  generatedBy: 'ai' | 'manual';
  scheduledFor?: Date;
  approvedBy?: string;
  approvedAt?: Date;
  rejectedBy?: string;
  rejectedAt?: Date;
  rejectionReason?: string;
  postedAt?: Date;
  postUrl?: string;
  metadata: {
    version: number;
    previousVersions?: any[];
    userPrompt?: string;
    generateImage?: boolean;
    generatedImageId?: string;
    generatedImageUrl?: string;
    imagePrompt?: string;
    imageError?: string;
    aiMetadata?: {
      model: string;
      temperature: number;
      promptTokens: number;
      completionTokens: number;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

const ContentQueueSchema = new Schema<IContentQueue>(
  {
    platform: {
      type: String,
      required: true,
      enum: ['linkedin', 'instagram', 'twitter', 'facebook'],
    },
    content: {
      text: { type: String, default: '' },
      hashtags: [String],
      mediaIds: [{ type: Schema.Types.ObjectId, ref: 'MediaUpload' }],
    },
    status: {
      type: String,
      required: true,
      enum: [
        'pending',
        'approved',
        'rejected',
        'posted',
        'scheduled',
      ],
      default: 'pending',
    },
    generationStatus: {
      type: String,
      enum: ['generating', 'completed', 'failed'],
    },
    generationError: { type: String },
    brandConfigId: { type: String, required: true },
    generatedBy: {
      type: String,
      required: true,
      enum: ['ai', 'manual'],
    },
    scheduledFor: Date,
    approvedBy: String,
    approvedAt: Date,
    rejectedBy: String,
    rejectedAt: Date,
    rejectionReason: String,
    postedAt: Date,
    postUrl: String,
    metadata: {
      version: { type: Number, default: 1 },
      previousVersions: [Schema.Types.Mixed],
      userPrompt: String,
      generateImage: Boolean,
      generatedImageId: String,
      generatedImageUrl: String,
      imagePrompt: String,
      imageError: String,
      aiMetadata: {
        model: String,
        temperature: Number,
        promptTokens: Number,
        completionTokens: Number,
      },
    },
  },
  { timestamps: true },
);

export const ContentQueue = mongoose.model<IContentQueue>(
  'ContentQueue',
  ContentQueueSchema,
);

// System Control Model
export type SystemMode =
  | 'active'
  | 'paused'
  | 'manual-only'
  | 'crisis';

export interface ISystemControl extends Document {
  mode: SystemMode;
  lastChangedBy: string;
  lastChangedAt: Date;
  reason?: string;
  settings: {
    autoPostingEnabled: boolean;
    requireApprovalForAll: boolean;
    maxDailyPosts: number;
  };
}

const SystemControlSchema = new Schema<ISystemControl>({
  mode: {
    type: String,
    required: true,
    enum: ['active', 'paused', 'manual-only', 'crisis'],
    default: 'active',
  },
  lastChangedBy: { type: String, required: true },
  lastChangedAt: { type: Date, default: Date.now },
  reason: String,
  settings: {
    autoPostingEnabled: { type: Boolean, default: true },
    requireApprovalForAll: { type: Boolean, default: true },
    maxDailyPosts: { type: Number, default: 5 },
  },
});

export const SystemControl = mongoose.model<ISystemControl>(
  'SystemControl',
  SystemControlSchema,
);

// Audit Log Model
export interface IAuditLog extends Document {
  action: string;
  performedBy: string;
  entityType: string;
  entityId: string;
  details: any;
  timestamp: Date;
}

const AuditLogSchema = new Schema<IAuditLog>({
  action: { type: String, required: true },
  performedBy: { type: String, required: true },
  entityType: { type: String, required: true },
  entityId: { type: String, required: true },
  details: Schema.Types.Mixed,
  timestamp: { type: Date, default: Date.now },
});

export const AuditLog = mongoose.model<IAuditLog>(
  'AuditLog',
  AuditLogSchema,
);
