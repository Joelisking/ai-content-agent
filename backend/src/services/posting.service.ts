import cron from 'node-cron';
import {
  ContentQueue,
  SystemControl,
  AuditLog,
  MediaUpload,
} from '../models';
import { instagramService } from './instagram.service';

interface PostingResult {
  success: boolean;
  postUrl?: string;
  error?: string;
}

export class PostingService {
  private cronJob: cron.ScheduledTask | null = null;

  constructor() {
    this.initializeScheduler();
  }

  /**
   * Initialize the posting scheduler
   */
  private initializeScheduler() {
    // Run every minute to check for scheduled posts
    this.cronJob = cron.schedule('* * * * *', async () => {
      await this.processScheduledPosts();
    });

    console.log('📅 Posting scheduler initialized');
  }

  /**
   * Process scheduled posts that are due
   */
  private async processScheduledPosts() {
    try {
      // Check system control mode
      const systemControl = await SystemControl.findOne().sort({
        lastChangedAt: -1,
      });

      if (!systemControl || systemControl.mode !== 'active') {
        console.log(
          `⏸️  Posting paused - system in ${systemControl?.mode || 'unknown'} mode`,
        );
        return;
      }

      if (!systemControl.settings.autoPostingEnabled) {
        console.log('⏸️  Auto-posting disabled');
        return;
      }

      // Find approved posts scheduled for now or earlier
      const now = new Date();
      const dueContent = await ContentQueue.find({
        status: 'approved',
        scheduledFor: { $lte: now },
      }).sort({ scheduledFor: 1 });

      console.log(
        `📋 Found ${dueContent.length} posts ready to publish`,
      );

      for (const content of dueContent) {
        await this.publishContent(content._id.toString());
      }
    } catch (error) {
      console.error('❌ Error processing scheduled posts:', error);
    }
  }

  /**
   * Publish content to platform (simulated or real)
   */
  async publishContent(contentId: string): Promise<PostingResult> {
    try {
      const content = await ContentQueue.findById(contentId);

      if (!content) {
        throw new Error('Content not found');
      }

      if (content.status !== 'approved') {
        throw new Error(
          `Content must be approved before posting (current status: ${content.status})`,
        );
      }

      // Check system mode - only block on crisis
      // Paused mode is handled by the scheduler; manual posts are allowed when paused
      const systemControl = await SystemControl.findOne().sort({
        lastChangedAt: -1,
      });
      if (systemControl?.mode === 'crisis') {
        throw new Error('System in crisis mode - posting blocked');
      }

      // Simulate posting (in production, this would call actual social media APIs)
      console.log(`📤 Publishing to ${content.platform}...`);
      const result = await this.simulatePosting(content);

      // Update content status
      content.status = 'posted';
      content.postedAt = new Date();
      content.postUrl = result.postUrl;
      await content.save();

      // Log the action
      await AuditLog.create({
        action: 'content_posted',
        performedBy: 'system',
        entityType: 'content',
        entityId: contentId,
        details: {
          platform: content.platform,
          postUrl: result.postUrl,
          scheduledFor: content.scheduledFor,
          postedAt: content.postedAt,
        },
      });

      console.log(
        `✅ Successfully posted to ${content.platform}: ${result.postUrl}`,
      );

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Publishing error:', errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Simulate posting to social media platforms
   * In production, replace with actual API calls to LinkedIn, Instagram, etc.
   */
  private async simulatePosting(
    content: any,
  ): Promise<PostingResult> {
    // Real Instagram Posting
    if (content.platform === 'instagram') {
      try {
        console.log('📸 Attempting to publish to Instagram...');

        // Get media
        if (
          !content.content.mediaIds ||
          content.content.mediaIds.length === 0
        ) {
          throw new Error('Instagram posts require an image');
        }

        const media = await MediaUpload.findById(
          content.content.mediaIds[0],
        );
        if (!media || !media.path) {
          throw new Error('Media not found or invalid path');
        }

        // Ensure URL is public (Instagram requirement)
        const imageUrl = media.path;
        if (!imageUrl.startsWith('http')) {
          throw new Error(
            `Media path must be a public URL for Instagram API (Current: ${imageUrl}). Local files cannot be posted directly.`,
          );
        }

        const result = await instagramService.publishContent(
          imageUrl,
          content.content.text,
        );

        return {
          success: true,
          postUrl: result.permalink,
        };
      } catch (error) {
        // No fallback - fail if Instagram posting fails
        throw error;
      }
    }

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Generate mock post URL
    const platformUrls = {
      linkedin: `https://linkedin.com/posts/mock-${Date.now()}`,
      instagram: `https://instagram.com/p/mock-${Date.now()}`,
      twitter: `https://twitter.com/status/mock-${Date.now()}`,
      facebook: `https://facebook.com/posts/mock-${Date.now()}`,
    };

    const postUrl =
      platformUrls[content.platform as keyof typeof platformUrls];

    return {
      success: true,
      postUrl,
    };
  }

  /**
   * Manual immediate post (bypasses schedule)
   */
  async postImmediately(
    contentId: string,
    performedBy: string,
  ): Promise<PostingResult> {
    try {
      const content = await ContentQueue.findById(contentId);

      if (!content) {
        throw new Error('Content not found');
      }

      // Check permissions - only block crisis mode for manual posts
      // Manual posting is allowed in paused mode (only automation is blocked)
      const systemControl = await SystemControl.findOne().sort({
        lastChangedAt: -1,
      });
      if (systemControl?.mode === 'crisis') {
        throw new Error(
          'System in crisis mode - all posting blocked',
        );
      }

      const result = await this.publishContent(contentId);

      // Log manual override
      await AuditLog.create({
        action: 'manual_post',
        performedBy,
        entityType: 'content',
        entityId: contentId,
        details: {
          platform: content.platform,
          overrideSchedule: true,
          result,
        },
      });

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Schedule content for future posting
   */
  async scheduleContent(
    contentId: string,
    scheduledFor: Date,
  ): Promise<void> {
    const content = await ContentQueue.findById(contentId);

    if (!content) {
      throw new Error('Content not found');
    }

    if (content.status !== 'approved') {
      throw new Error('Only approved content can be scheduled');
    }

    content.scheduledFor = scheduledFor;
    content.status = 'scheduled';
    await content.save();

    console.log(
      `📅 Content scheduled for ${scheduledFor.toISOString()}`,
    );
  }

  /**
   * Get posting statistics
   */
  async getPostingStats(days: number = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const stats = await ContentQueue.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const platformStats = await ContentQueue.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: 'posted',
        },
      },
      {
        $group: {
          _id: '$platform',
          count: { $sum: 1 },
        },
      },
    ]);

    return {
      byStatus: stats,
      byPlatform: platformStats,
      timeRange: `Last ${days} days`,
    };
  }

  /**
   * Stop the scheduler (for testing or maintenance)
   */
  stopScheduler() {
    if (this.cronJob) {
      this.cronJob.stop();
      console.log('📅 Posting scheduler stopped');
    }
  }

  /**
   * Start the scheduler
   */
  startScheduler() {
    if (this.cronJob) {
      this.cronJob.start();
      console.log('📅 Posting scheduler started');
    }
  }
}
