import { logger } from '../utils/logger';

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export class EmailService {
  private readonly smtpConfig: {
    host: string;
    port: number;
    user: string;
    pass: string;
  };

  constructor() {
    this.smtpConfig = {
      host: process.env.SMTP_HOST || 'smtp.example.com',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
    };
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      logger.info(`Sending email to ${options.to} with subject: ${options.subject}`);

      // In production, use nodemailer or similar library
      // const transporter = nodemailer.createTransport({...});
      // await transporter.sendMail({...});

      // Simulate email sending
      await new Promise((resolve) => setTimeout(resolve, 50));

      logger.info(`Email sent successfully to ${options.to}`);
    } catch (error) {
      logger.error('Failed to send email:', error);
      throw new Error('邮件发送失败');
    }
  }
}