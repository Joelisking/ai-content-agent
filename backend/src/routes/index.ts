import express from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { v2 as cloudinary } from 'cloudinary';
import {
  BrandConfig,
  MediaUpload,
  ContentQueue,
  SystemControl,
  AuditLog,
} from '../models';
import { AIAgentService } from '../services/aiAgent.service';
import { PostingService } from '../services/posting.service';
import { contentScheduler } from '../services/contentScheduler.service';
import { emailService } from '../services/email.service';

const router = express.Router();

// Initialize services

const aiAgent = new AIAgentService();
const postingService = new PostingService();
// contentScheduler is auto-initialized on import

// Configure Cloudinary (lazy initialization)
let cloudinaryConfigured = false;
const ensureCloudinaryConfig = () => {
  if (!cloudinaryConfigured) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    cloudinaryConfigured = true;
  }
};

// Configure multer for memory storage (for Cloudinary upload)
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB default
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|avi/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase(),
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(
      new Error(
        'Invalid file type. Only images and videos are allowed.',
      ),
    );
  },
});

// Helper function to upload to Cloudinary
const uploadToCloudinary = (
  buffer: Buffer,
  options: any,
): Promise<any> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      options,
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      },
    );
    uploadStream.end(buffer);
  });
};

// ==================== BRAND CONFIGURATION ====================

router.post('/brand', async (req, res) => {
  try {
    const brand = new BrandConfig(req.body);
    await brand.save();
    res.status(201).json(brand);
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.get('/brand', async (req, res) => {
  try {
    const brands = await BrandConfig.find().sort({ createdAt: -1 });
    res.json(brands);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.get('/brand/:id', async (req, res) => {
  try {
    const brand = await BrandConfig.findById(req.params.id);
    if (!brand) {
      return res.status(404).json({ error: 'Brand not found' });
    }
    res.json(brand);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.put('/brand/:id', async (req, res) => {
  try {
    const brand = await BrandConfig.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true },
    );
    if (!brand) {
      return res.status(404).json({ error: 'Brand not found' });
    }

    await AuditLog.create({
      action: 'brand_updated',
      performedBy: req.body.updatedBy || 'admin',
      entityType: 'brand',
      entityId: brand._id.toString(),
      details: {
        name: brand.name,
        updatedFields: Object.keys(req.body),
      },
    });

    res.json(brand);
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ==================== MEDIA UPLOAD ====================

router.post(
  '/media/upload',
  upload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      // Ensure Cloudinary is configured
      ensureCloudinaryConfig();

      // Determine resource type for Cloudinary
      const isVideo = req.file.mimetype.startsWith('video/');
      const resourceType = isVideo ? 'video' : 'image';

      // Upload to Cloudinary
      const cloudinaryResult = await uploadToCloudinary(
        req.file.buffer,
        {
          folder: 'ai-content-agent',
          resource_type: resourceType,
          public_id: uuidv4(),
        },
      );

      const media = new MediaUpload({
        filename: cloudinaryResult.public_id,
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: cloudinaryResult.secure_url,
        metadata: req.body.metadata
          ? JSON.parse(req.body.metadata)
          : {},
      });

      await media.save();

      await AuditLog.create({
        action: 'media_uploaded',
        performedBy: req.body.uploadedBy || 'client',
        entityType: 'media',
        entityId: media._id.toString(),
        details: {
          filename: media.originalName,
          size: media.size,
          cloudinaryUrl: cloudinaryResult.secure_url,
        },
      });

      res.status(201).json(media);
    } catch (error) {
      console.error('Upload error:', error);
      res.status(400).json({
        error:
          error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },
);

router.get('/media', async (req, res) => {
  try {
    const media = await MediaUpload.find().sort({ uploadedAt: -1 });
    res.json(media);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.get('/media/:id', async (req, res) => {
  try {
    const media = await MediaUpload.findById(req.params.id);
    if (!media) {
      return res.status(404).json({ error: 'Media not found' });
    }
    res.json(media);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.delete('/media/:id', async (req, res) => {
  try {
    const media = await MediaUpload.findById(req.params.id);
    if (!media) {
      return res.status(404).json({ error: 'Media not found' });
    }

    // Ensure Cloudinary is configured
    ensureCloudinaryConfig();

    // Delete from Cloudinary
    const isVideo = media.mimetype.startsWith('video/');
    const resourceType = isVideo ? 'video' : 'image';

    try {
      await cloudinary.uploader.destroy(media.filename, {
        resource_type: resourceType,
      });
    } catch (cloudinaryError) {
      console.error('Cloudinary delete error:', cloudinaryError);
    }

    // Delete from database
    await MediaUpload.findByIdAndDelete(req.params.id);

    await AuditLog.create({
      action: 'media_deleted',
      performedBy: req.body.deletedBy || 'admin',
      entityType: 'media',
      entityId: req.params.id,
      details: {
        filename: media.originalName,
      },
    });

    res.json({
      success: true,
      message: 'Media deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ==================== CONTENT GENERATION ====================

// Async function to process AI generation in the background
async function processGenerationAsync(contentId: string) {
  try {
    const content = await ContentQueue.findById(contentId);
    if (!content) {
      console.error(`Content ${contentId} not found for generation`);
      return;
    }

    const brandConfig = await BrandConfig.findById(
      content.brandConfigId,
    );
    if (!brandConfig) {
      await ContentQueue.findByIdAndUpdate(contentId, {
        generationStatus: 'failed',
        generationError: 'Brand configuration not found',
      });
      return;
    }

    // Build media context if media IDs provided
    let mediaContext = '';
    const mediaIds = content.content.mediaIds;
    if (mediaIds && mediaIds.length > 0) {
      const media = await MediaUpload.find({
        _id: { $in: mediaIds },
      });
      mediaContext = media
        .map(
          (m) =>
            `Media: ${m.originalName} (${m.mimetype})${m.metadata?.description ? ` - ${m.metadata.description}` : ''}`,
        )
        .join('\n');
    }

    // Fetch recent content for context (to avoid duplicates)
    const recentContent = await ContentQueue.find({
      brandConfigId: content.brandConfigId,
      status: {
        $in: [
          'pending',
          'posted',
          'scheduled',
          'approved',
          'rejected',
        ],
      },
      _id: { $ne: contentId }, // Exclude current content
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('content.text');

    const previousContent = recentContent.map((c) => c.content.text);

    // Generate content using AI agent
    const generated = await aiAgent.generateContent({
      brandConfig,
      platform: content.platform,
      mediaContext: mediaContext || undefined,
      userPrompt: (content.metadata as any)?.userPrompt || undefined,
      previousContent,
      generateImage: (content.metadata as any)?.generateImage || false,
    });

    // If image was generated, save it to MediaUpload and attach to content
    let generatedMediaId: string | undefined;
    if (generated.imageUrl) {
      const generatedMedia = new MediaUpload({
        filename: `ai-generated-${Date.now()}`,
        originalName: 'AI Generated Image',
        mimetype: 'image/png',
        size: 0, // Size unknown for URL-based uploads
        path: generated.imageUrl,
        metadata: {
          aiGenerated: true,
          imagePrompt: generated.imagePrompt,
        },
      });
      await generatedMedia.save();
      generatedMediaId = generatedMedia._id.toString();
    }

    // Update content with generated results
    const updateData: any = {
      'content.text': generated.text,
      'content.hashtags': generated.hashtags,
      generationStatus: 'completed',
      'metadata.aiMetadata': generated.metadata,
    };

    // Attach generated image if created
    if (generatedMediaId) {
      updateData['metadata.generatedImageId'] = generatedMediaId;
      updateData['metadata.generatedImageUrl'] = generated.imageUrl;
      updateData['metadata.imagePrompt'] = generated.imagePrompt;
      // Add to mediaIds if no media was already attached
      if (!content.content.mediaIds || content.content.mediaIds.length === 0) {
        updateData['content.mediaIds'] = [generatedMediaId];
      }
    }

    // Save image generation error if any
    if (generated.imageError) {
      updateData['metadata.imageError'] = generated.imageError;
    }

    await ContentQueue.findByIdAndUpdate(contentId, updateData);

    await AuditLog.create({
      action: 'content_generated',
      performedBy: 'ai_agent',
      entityType: 'content',
      entityId: contentId,
      details: {
        platform: content.platform,
        reasoning: generated.reasoning,
      },
    });

    // Send email notification if approvers are configured
    if (brandConfig.approverEmails?.length > 0) {
      emailService
        .sendApprovalNotification(brandConfig.approverEmails, {
          brandName: brandConfig.name,
          platform: content.platform,
          contentPreview: generated.text,
          contentId: contentId,
          hashtags: generated.hashtags,
        })
        .catch((err) =>
          console.error('Failed to send approval notification:', err),
        );
    }

    console.log(`Content generation completed for ${contentId}`);
  } catch (error) {
    console.error(`Content generation failed for ${contentId}:`, error);
    await ContentQueue.findByIdAndUpdate(contentId, {
      generationStatus: 'failed',
      generationError:
        error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

router.post('/content/generate', async (req, res) => {
  try {
    const { brandConfigId, platform, mediaIds, userPrompt, generateImage } =
      req.body;

    // Check system mode before generation
    const systemControl = await SystemControl.findOne().sort({ lastChangedAt: -1 });
    if (systemControl?.mode === 'crisis') {
      return res.status(503).json({
        error: 'System in crisis mode - all operations blocked'
      });
    }
    if (systemControl?.mode === 'paused') {
      return res.status(503).json({
        error: 'System paused - content generation disabled'
      });
    }

    // Validate inputs
    if (!brandConfigId || !platform) {
      return res
        .status(400)
        .json({ error: 'brandConfigId and platform are required' });
    }

    // Instagram requires media
    if (platform === 'instagram' && (!mediaIds || mediaIds.length === 0)) {
      return res
        .status(400)
        .json({ error: 'Instagram posts require at least one media item' });
    }

    // Platform-specific media limits
    const mediaLimits: Record<string, number> = {
      instagram: 20,
      twitter: 4,
      linkedin: 20,
      facebook: 40,
    };
    const limit = mediaLimits[platform];
    if (limit && mediaIds && mediaIds.length > limit) {
      return res.status(400).json({
        error: `${platform.charAt(0).toUpperCase() + platform.slice(1)} posts allow a maximum of ${limit} media items`,
      });
    }

    // Verify brand config exists
    const brandConfig = await BrandConfig.findById(brandConfigId);
    if (!brandConfig) {
      return res
        .status(404)
        .json({ error: 'Brand configuration not found' });
    }

    // Create content queue entry immediately with generating status
    const content = new ContentQueue({
      platform,
      content: {
        text: '', // Will be filled by async process
        hashtags: [],
        mediaIds: mediaIds || [],
      },
      status: 'pending',
      generationStatus: 'generating',
      brandConfigId,
      generatedBy: 'ai',
      metadata: {
        version: 1,
        userPrompt: userPrompt || undefined, // Store for async process
        generateImage: generateImage || false, // Store for async process
      },
    });

    await content.save();

    // Fire-and-forget: start AI generation in background
    processGenerationAsync(content._id.toString()).catch((err) =>
      console.error('Background generation error:', err),
    );

    // Return immediately with generating status
    res.status(201).json({
      _id: content._id,
      platform: content.platform,
      generationStatus: 'generating',
      status: content.status,
      brandConfigId: content.brandConfigId,
      createdAt: content.createdAt,
    });
  } catch (error) {
    console.error('Content generation error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/content/:id/regenerate', async (req, res) => {
  try {
    const { feedback, platform: newPlatform } = req.body;
    const content = await ContentQueue.findById(req.params.id);

    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    const brandConfig = await BrandConfig.findById(
      content.brandConfigId,
    );
    if (!brandConfig) {
      return res
        .status(404)
        .json({ error: 'Brand configuration not found' });
    }

    // Determine target platform
    const targetPlatform = newPlatform || content.platform;

    // Generate new version
    const regenerated = await aiAgent.regenerateContent(
      content.content.text,
      feedback,
      {
        brandConfig,
        platform: targetPlatform,
      },
    );

    // Save previous version
    const previousVersion = {
      version: content.metadata.version,
      text: content.content.text,
      hashtags: content.content.hashtags,
      timestamp: new Date(),
    };

    // Update content
    content.content.text = regenerated.text;
    content.content.hashtags = regenerated.hashtags;
    content.metadata.version += 1;
    if (newPlatform && newPlatform !== content.platform) {
      content.platform = newPlatform;
    }

    content.metadata.previousVersions =
      content.metadata.previousVersions || [];
    content.metadata.previousVersions.push(previousVersion);
    content.status = 'pending';

    await content.save();

    await AuditLog.create({
      action: 'content_regenerated',
      performedBy: req.body.performedBy || 'user',
      entityType: 'content',
      entityId: content._id.toString(),
      details: {
        feedback,
        version: content.metadata.version,
      },
    });

    res.json({
      ...content.toObject(),
      reasoning: regenerated.reasoning,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ==================== CONTENT APPROVAL ====================

router.get('/content', async (req, res) => {
  try {
    const { status, platform } = req.query;
    const filter: any = {};

    if (status) filter.status = status;
    if (platform) filter.platform = platform;

    const content = await ContentQueue.find(filter)
      .sort({ createdAt: -1 })
      .populate('content.mediaIds');
    res.json(content);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.get('/content/:id', async (req, res) => {
  try {
    const content = await ContentQueue.findById(req.params.id);
    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }
    res.json(content);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Update content text (for manual edits)
router.put('/content/:id', async (req, res) => {
  try {
    const { text, hashtags } = req.body;
    const content = await ContentQueue.findById(req.params.id);

    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    // Only allow editing pending content
    if (content.status !== 'pending') {
      return res.status(400).json({
        error: `Cannot edit content with status '${content.status}'. Only pending content can be edited.`,
      });
    }

    // Update fields
    if (text !== undefined) {
      content.content.text = text;
    }
    if (hashtags !== undefined) {
      content.content.hashtags = hashtags;
    }

    // Mark as manually edited
    (content.metadata as any).manuallyEdited = true;
    (content.metadata as any).editedAt = new Date();

    await content.save();

    // Log the edit
    await AuditLog.create({
      action: 'content_edited',
      performedBy: 'admin',
      entityType: 'content',
      entityId: content._id.toString(),
      details: {
        platform: content.platform,
        textLength: text?.length,
        hashtagCount: hashtags?.length,
      },
    });

    res.json(content);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/content/:id/approve', async (req, res) => {
  try {
    const { approvedBy, scheduledFor } = req.body;
    const content = await ContentQueue.findById(req.params.id);

    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    if (content.status === 'posted') {
      return res
        .status(400)
        .json({ error: 'Content already posted' });
    }

    content.status = 'approved';
    content.approvedBy = approvedBy || 'admin';
    content.approvedAt = new Date();

    if (scheduledFor) {
      content.scheduledFor = new Date(scheduledFor);
    }

    await content.save();

    await AuditLog.create({
      action: 'content_approved',
      performedBy: approvedBy || 'admin',
      entityType: 'content',
      entityId: content._id.toString(),
      details: {
        platform: content.platform,
        scheduledFor: content.scheduledFor,
      },
    });

    res.json(content);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/content/:id/reject', async (req, res) => {
  try {
    const { rejectedBy, reason } = req.body;
    const content = await ContentQueue.findById(req.params.id);

    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    content.status = 'rejected';
    content.rejectedBy = rejectedBy || 'admin';
    content.rejectedAt = new Date();
    content.rejectionReason = reason;

    await content.save();

    await AuditLog.create({
      action: 'content_rejected',
      performedBy: rejectedBy || 'admin',
      entityType: 'content',
      entityId: content._id.toString(),
      details: {
        reason,
      },
    });

    res.json(content);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ==================== POSTING ====================

router.post('/content/:id/post', async (req, res) => {
  try {
    const { performedBy } = req.body;
    const result = await postingService.postImmediately(
      req.params.id,
      performedBy || 'admin',
    );

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.get('/posting/stats', async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const stats = await postingService.getPostingStats(days);
    res.json(stats);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ==================== SYSTEM CONTROL ====================

router.get('/system/control', async (req, res) => {
  try {
    let control = await SystemControl.findOne().sort({
      lastChangedAt: -1,
    });

    if (!control) {
      control = new SystemControl({
        mode: 'active',
        lastChangedBy: 'system',
        settings: {
          autoPostingEnabled: true,
          requireApprovalForAll: true,
          maxDailyPosts: 5,
        },
      });
      await control.save();
    }

    res.json(control);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/system/control', async (req, res) => {
  try {
    const { mode, changedBy, reason, settings } = req.body;

    const control = new SystemControl({
      mode: mode || 'active',
      lastChangedBy: changedBy || 'admin',
      lastChangedAt: new Date(),
      reason,
      settings: settings || {
        autoPostingEnabled: true,
        requireApprovalForAll: true,
        maxDailyPosts: 5,
      },
    });

    await control.save();

    await AuditLog.create({
      action: 'system_control_changed',
      performedBy: changedBy || 'admin',
      entityType: 'system',
      entityId: control._id.toString(),
      details: {
        mode,
        reason,
        settings,
      },
    });

    // Handle schedulers based on mode
    if (mode === 'paused' || mode === 'crisis') {
      postingService.stopScheduler();
      contentScheduler.stopScheduler();
    } else if (mode === 'active') {
      postingService.startScheduler();
      contentScheduler.startScheduler();
    }

    res.json(control);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ==================== AUDIT LOGS ====================

router.get('/audit', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const logs = await AuditLog.find()
      .sort({ timestamp: -1 })
      .limit(limit);
    res.json(logs);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ==================== DASHBOARD STATS ====================

router.get('/dashboard/stats', async (req, res) => {
  try {
    const [
      totalContent,
      pendingContent,
      approvedContent,
      postedContent,
      totalMedia,
    ] = await Promise.all([
      ContentQueue.countDocuments(),
      ContentQueue.countDocuments({ status: 'pending' }),
      ContentQueue.countDocuments({ status: 'approved' }),
      ContentQueue.countDocuments({ status: 'posted' }),
      MediaUpload.countDocuments(),
    ]);

    const systemControl = await SystemControl.findOne().sort({
      lastChangedAt: -1,
    });

    res.json({
      content: {
        total: totalContent,
        pending: pendingContent,
        approved: approvedContent,
        posted: postedContent,
      },
      media: {
        total: totalMedia,
      },
      system: {
        mode: systemControl?.mode || 'unknown',
        autoPostingEnabled:
          systemControl?.settings.autoPostingEnabled || false,
      },
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ==================== SCHEDULED CONTENT GENERATION ====================

// Get upcoming scheduled content generations
router.get('/schedules/upcoming', async (req, res) => {
  try {
    const hours = parseInt(req.query.hours as string) || 24;
    const upcoming = await contentScheduler.getUpcomingSchedules(hours);
    res.json(upcoming);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Update brand generation schedule
router.put('/brands/:id/schedule', async (req, res) => {
  try {
    const { generationSchedule } = req.body;

    const brand = await BrandConfig.findByIdAndUpdate(
      req.params.id,
      { generationSchedule },
      { new: true },
    );

    if (!brand) {
      return res.status(404).json({ error: 'Brand not found' });
    }

    // Log the action
    await AuditLog.create({
      action: 'brand_schedule_updated',
      performedBy: 'admin',
      entityType: 'brand',
      entityId: brand._id.toString(),
      details: {
        brandName: brand.name,
        generationSchedule,
      },
    });

    res.json(brand);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
