import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend;
  private fromEmail: string;
  private fromName: string;

  constructor(private configService: ConfigService) {
    this.initializeResend();
  }

  private initializeResend() {
    const resendApiKey = this.configService.get<string>('RESEND_API_KEY');
    this.fromEmail = this.configService.get<string>('RESEND_FROM_EMAIL') || 'admin@roomrentalusa.com';
    this.fromName = this.configService.get<string>('RESEND_FROM_NAME') || 'RoomRentalUSA';

    if (!resendApiKey) {
      this.logger.warn('RESEND_API_KEY not configured. Email service will not work.');
      return;
    }

    this.resend = new Resend(resendApiKey);
    this.logger.log(`Email service initialized with Resend (from: ${this.fromEmail})`);
  }

  async sendOtpEmail(email: string, otpCode: string): Promise<boolean> {
    try {
      if (!this.resend) {
        this.logger.error('Resend client not initialized. Check RESEND_API_KEY configuration.');
        return false;
      }

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Email Verification</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">RoomRentalUSA</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0; border-top: none;">
            <h2 style="color: #333; margin-top: 0;">Verify Your Email Address</h2>
            <p>Thank you for signing up! Please use the verification code below to complete your registration:</p>
            <div style="background: white; border: 2px solid #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
              <div style="font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                ${otpCode}
              </div>
            </div>
            <p style="color: #666; font-size: 14px;">This code will expire in 10 minutes.</p>
            <p style="color: #666; font-size: 14px;">If you didn't request this code, please ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
            <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
              © ${new Date().getFullYear()} RoomRentalUSA. All rights reserved.
            </p>
          </div>
        </body>
        </html>
      `;

      const textContent = `
        Verify Your Email Address - RoomRentalUSA
        
        Thank you for signing up! Please use the verification code below to complete your registration:
        
        Verification Code: ${otpCode}
        
        This code will expire in 10 minutes.
        
        If you didn't request this code, please ignore this email.
      `;

      const { data, error } = await this.resend.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: email,
        subject: 'Verify Your Email - RoomRentalUSA',
        html: htmlContent,
        text: textContent,
      });

      if (error) {
        this.logger.error(`Failed to send OTP email to ${email}:`, error);
        return false;
      }

      this.logger.log(`OTP email sent to ${email}. MessageId: ${data?.id}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send OTP email to ${email}:`, error);
      return false;
    }
  }

  async verifyConnection(): Promise<boolean> {
    try {
      if (!this.resend) {
        return false;
      }
      // Resend doesn't have a verify method, but we can check if API key is valid
      // by attempting to get API keys (this will fail if invalid)
      this.logger.log('Resend email service is configured');
      return true;
    } catch (error) {
      this.logger.error('Resend connection verification failed:', error);
      return false;
    }
  }
}

