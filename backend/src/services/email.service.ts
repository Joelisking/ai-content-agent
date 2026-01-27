import { Resend } from 'resend';

interface ApprovalNotificationData {
  brandName: string;
  platform: string;
  contentPreview: string;
  contentId: string;
  hashtags?: string[];
}

export class EmailService {
  private resend: Resend | null = null;

  private get fromEmail(): string {
    return process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
  }

  private get appUrl(): string {
    return process.env.APP_URL || 'http://localhost:3000';
  }

  constructor() {}

  private getClient(): Resend | null {
    if (!this.resend) {
      const apiKey = process.env.RESEND_API_KEY;
      if (apiKey && apiKey !== 'your_resend_api_key') {
        this.resend = new Resend(apiKey);
      } else {
        // Only warn once
        if (apiKey !== 'your_resend_api_key') {
          console.warn(
            'RESEND_API_KEY is not set or valid. Email notifications will be disabled.',
          );
        }
      }
    }
    return this.resend;
  }

  async sendApprovalNotification(
    to: string[],
    data: ApprovalNotificationData,
  ): Promise<boolean> {
    const client = this.getClient();
    if (!client) {
      console.log(
        'Email service not configured, skipping notification.',
      );
      return false;
    }

    if (!to || to.length === 0) {
      return false;
    }

    try {
      const subject = `[Action Required] Approve new ${data.platform} content for ${data.brandName}`;
      const approvalLink = `${this.appUrl}/content?highlight=${data.contentId}`;

      const { error } = await client.emails.send({
        from: this.fromEmail,
        to: to,
        subject: subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>New Content Needs Approval</h2>
            <p><strong>Brand:</strong> ${data.brandName}</p>
            <p><strong>Platform:</strong> ${data.platform}</p>
            
            <div style="background-color: #f4f4f4; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3>Content Preview:</h3>
              <p style="white-space: pre-wrap;">${data.contentPreview}</p>
              ${data.hashtags && data.hashtags.length > 0 ? `<p><strong>Hashtags:</strong> ${data.hashtags.join(' ')}</p>` : ''}
            </div>
            
            <a href="${approvalLink}" style="display: inline-block; background-color: #0070f3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 10px;">Review & Approve</a>
            
            <p style="margin-top: 20px; font-size: 12px; color: #666;">
              This is an automated message from your AI Content Agent.
            </p>
          </div>
        `,
        text: `
New Content Needs Approval

Brand: ${data.brandName}
Platform: ${data.platform}

Content Preview:
${data.contentPreview}
${data.hashtags ? `Hashtags: ${data.hashtags.join(' ')}` : ''}

Review & Approve: ${approvalLink}
        `,
      });

      if (error) {
        console.error('Error sending email:', error);
        return false;
      }

      console.log(
        `Approval notification sent to ${to.length} recipients for brand ${data.brandName}`,
      );
      return true;
    } catch (err) {
      console.error('Unexpected error sending email:', err);
      return false;
    }
  }
}

export const emailService = new EmailService();
