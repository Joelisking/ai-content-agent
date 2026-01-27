import cron from 'node-cron';
import {
  BrandConfig,
  ContentQueue,
  SystemControl,
  AuditLog,
  IBrandConfig,
  Platform,
} from '../models';
import { aiAgent } from './aiAgent.service';

interface ScheduledGeneration {
  brandId: string;
  brandName: string;
  platform: Platform;
  time: string;
}

export class ContentSchedulerService {
  private cronJob: cron.ScheduledTask | null = null;
  private lastRunMinute: string = '';

  constructor() {
    this.initializeScheduler();
  }

  /**
   * Initialize the content generation scheduler
   */
  private initializeScheduler() {
    // Run every minute to check for scheduled content generation
    this.cronJob = cron.schedule('* * * * *', async () => {
      await this.processScheduledGenerations();
    });

    console.log('📝 Content generation scheduler initialized');
  }

  /**
   * Check if current time matches a scheduled time (within the same minute)
   */
  private isTimeMatch(scheduledTime: string): boolean {
    const now = new Date();
    const [scheduledHour, scheduledMinute] = scheduledTime.split(':').map(Number);

    return (
      now.getHours() === scheduledHour &&
      now.getMinutes() === scheduledMinute
    );
  }

  /**
   * Check if current day matches scheduled days
   */
  private isDayMatch(daysOfWeek: number[], frequency: string): boolean {
    const today = new Date().getDay(); // 0 = Sunday, 6 = Saturday

    if (frequency === 'daily') {
      return true;
    }

    if (frequency === 'weekly') {
      // Default to Monday (1) if no days specified
      const scheduledDays = daysOfWeek.length > 0 ? daysOfWeek : [1];
      return scheduledDays.includes(today);
    }

    if (frequency === 'custom') {
      return daysOfWeek.includes(today);
    }

    return false;
  }

  /**
   * Get the current minute key to prevent duplicate runs
   */
  private getCurrentMinuteKey(): string {
    const now = new Date();
    return `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}-${now.getMinutes()}`;
  }

  /**
   * Process scheduled content generations
   */
  private async processScheduledGenerations() {
    try {
      // Prevent running multiple times in the same minute
      const currentMinute = this.getCurrentMinuteKey();
      if (this.lastRunMinute === currentMinute) {
        return;
      }
      this.lastRunMinute = currentMinute;

      // Check system control mode
      const systemControl = await SystemControl.findOne().sort({
        lastChangedAt: -1,
      });

      // Don't generate content if system is paused or in crisis mode
      if (systemControl?.mode === 'crisis' || systemControl?.mode === 'paused') {
        console.log(
          `⏸️  Content generation paused - system in ${systemControl?.mode} mode`,
        );
        return;
      }

      // Find all brands with enabled generation schedules
      const brands = await BrandConfig.find({
        'generationSchedule.enabled': true,
      });

      if (brands.length === 0) {
        return; // No brands with scheduled generation
      }

      const scheduledGenerations: ScheduledGeneration[] = [];

      for (const brand of brands) {
        const schedule = brand.generationSchedule;
        if (!schedule?.enabled) continue;

        // Check if today is a scheduled day
        if (!this.isDayMatch(schedule.daysOfWeek || [], schedule.frequency)) {
          continue;
        }

        // Check each scheduled time
        for (const time of schedule.timesOfDay || []) {
          if (this.isTimeMatch(time)) {
            // Add generation task for each configured platform
            for (const platform of schedule.platforms || []) {
              scheduledGenerations.push({
                brandId: brand._id.toString(),
                brandName: brand.name,
                platform: platform as Platform,
                time,
              });
            }
          }
        }
      }

      if (scheduledGenerations.length > 0) {
        console.log(
          `📝 Processing ${scheduledGenerations.length} scheduled content generations`,
        );

        for (const task of scheduledGenerations) {
          await this.generateScheduledContent(task);
        }
      }
    } catch (error) {
      console.error('❌ Error processing scheduled generations:', error);
    }
  }

  /**
   * Generate content for a scheduled task
   */
  private async generateScheduledContent(task: ScheduledGeneration) {
    try {
      console.log(
        `🤖 Auto-generating ${task.platform} content for ${task.brandName}...`,
      );

      const brand = await BrandConfig.findById(task.brandId);
      if (!brand) {
        console.error(`Brand ${task.brandId} not found`);
        return;
      }

      const schedule = brand.generationSchedule;

      // Create content queue entry
      const content = new ContentQueue({
        platform: task.platform,
        content: {
          text: '',
          hashtags: [],
          mediaIds: [],
        },
        status: 'pending',
        generationStatus: 'generating',
        brandConfigId: task.brandId,
        generatedBy: 'ai',
        metadata: {
          version: 1,
          userPrompt: schedule?.promptTemplate || undefined,
          generateImage: schedule?.autoGenerateImage || false,
          scheduledGeneration: true,
          scheduledTime: task.time,
        },
      });

      await content.save();

      // Fetch recent content to avoid duplicates
      const recentContent = await ContentQueue.find({
        brandConfigId: task.brandId,
        status: { $in: ['pending', 'posted', 'scheduled', 'approved'] },
        _id: { $ne: content._id },
      })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('content.text');

      const previousContent = recentContent
        .map((c) => c.content.text)
        .filter(Boolean);

      // Generate content using AI agent
      const generated = await aiAgent.generateContent({
        brandConfig: brand,
        platform: task.platform,
        userPrompt: schedule?.promptTemplate,
        previousContent,
        generateImage: schedule?.autoGenerateImage || false,
      });

      // Update content with generated text
      await ContentQueue.findByIdAndUpdate(content._id, {
        'content.text': generated.text,
        'content.hashtags': generated.hashtags,
        generationStatus: 'completed',
        'metadata.aiMetadata': generated.metadata,
        'metadata.reasoning': generated.reasoning,
      });

      // Log the action
      await AuditLog.create({
        action: 'scheduled_content_generated',
        performedBy: 'system',
        entityType: 'content',
        entityId: content._id.toString(),
        details: {
          brandId: task.brandId,
          brandName: task.brandName,
          platform: task.platform,
          scheduledTime: task.time,
          autoGenerateImage: schedule?.autoGenerateImage,
        },
      });

      console.log(
        `✅ Auto-generated ${task.platform} content for ${task.brandName}`,
      );
    } catch (error) {
      console.error(
        `❌ Failed to generate content for ${task.brandName}:`,
        error,
      );

      // Log failure
      await AuditLog.create({
        action: 'scheduled_content_generation_failed',
        performedBy: 'system',
        entityType: 'brand',
        entityId: task.brandId,
        details: {
          brandName: task.brandName,
          platform: task.platform,
          scheduledTime: task.time,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }
  }

  /**
   * Get upcoming scheduled generations for the next N hours
   */
  async getUpcomingSchedules(hours: number = 24): Promise<any[]> {
    const brands = await BrandConfig.find({
      'generationSchedule.enabled': true,
    });

    const upcoming: any[] = [];
    const now = new Date();
    const endTime = new Date(now.getTime() + hours * 60 * 60 * 1000);

    for (const brand of brands) {
      const schedule = brand.generationSchedule;
      if (!schedule?.enabled) continue;

      for (const time of schedule.timesOfDay || []) {
        const [hour, minute] = time.split(':').map(Number);

        // Check next N days
        for (let dayOffset = 0; dayOffset < Math.ceil(hours / 24); dayOffset++) {
          const checkDate = new Date(now);
          checkDate.setDate(checkDate.getDate() + dayOffset);
          checkDate.setHours(hour, minute, 0, 0);

          if (checkDate <= now || checkDate > endTime) continue;

          const dayOfWeek = checkDate.getDay();
          if (this.isDayMatch([dayOfWeek], schedule.frequency)) {
            for (const platform of schedule.platforms || []) {
              upcoming.push({
                brandId: brand._id,
                brandName: brand.name,
                platform,
                scheduledFor: checkDate,
                time,
              });
            }
          }
        }
      }
    }

    return upcoming.sort(
      (a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime(),
    );
  }

  /**
   * Stop the scheduler
   */
  stopScheduler() {
    if (this.cronJob) {
      this.cronJob.stop();
      console.log('📝 Content generation scheduler stopped');
    }
  }

  /**
   * Start the scheduler
   */
  startScheduler() {
    if (this.cronJob) {
      this.cronJob.start();
      console.log('📝 Content generation scheduler started');
    }
  }
}

export const contentScheduler = new ContentSchedulerService();
