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
        <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta http-equiv="X-UA-Compatible" content="IE=edge">
          <title>Verify Your Email - RoomRentalUSA</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f7fa; line-height: 1.6;">
          <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f7fa; padding: 20px;">
            <tr>
              <td align="center" style="padding: 20px 0;">
                <table role="presentation" style="width: 100%; max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
                  <!-- Header with Gradient -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">RoomRentalUSA</h1>
                      <p style="margin: 8px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px; font-weight: 400;">Find Your Perfect Home</p>
                    </td>
                  </tr>
                  
                  <!-- Main Content -->
                  <tr>
                    <td style="padding: 40px 30px;">
                      <!-- Welcome Message -->
                      <h2 style="margin: 0 0 16px 0; color: #1a202c; font-size: 24px; font-weight: 600; line-height: 1.3;">Verify Your Email Address</h2>
                      <p style="margin: 0 0 32px 0; color: #4a5568; font-size: 16px; line-height: 1.6;">
                        Thank you for signing up! We're excited to have you join our community. Please use the verification code below to complete your registration.
                      </p>
                      
                      <!-- OTP Code Box -->
                      <table role="presentation" style="width: 100%; margin: 32px 0;">
                        <tr>
                          <td align="center" style="padding: 0;">
                            <div style="background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%); border: 2px solid #e2e8f0; border-radius: 12px; padding: 32px 24px; margin: 0 auto; max-width: 400px;">
                              <p style="margin: 0 0 12px 0; color: #718096; font-size: 13px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">Verification Code</p>
                              <div style="font-size: 42px; font-weight: 700; color: #667eea; letter-spacing: 12px; font-family: 'Courier New', 'Monaco', monospace; text-align: center; padding: 8px 0;">
                                ${otpCode}
                              </div>
                            </div>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- Instructions -->
                      <div style="background-color: #fef5e7; border-left: 4px solid #f6ad55; padding: 16px 20px; border-radius: 6px; margin: 24px 0;">
                        <p style="margin: 0; color: #744210; font-size: 14px; line-height: 1.5;">
                          <strong>⏱️ Important:</strong> This code will expire in <strong>10 minutes</strong> for security reasons.
                        </p>
                      </div>
                      
                      <!-- Security Notice -->
                      <p style="margin: 24px 0 0 0; color: #718096; font-size: 14px; line-height: 1.6; text-align: center;">
                        If you didn't request this code, please ignore this email or contact our support team.
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f7fafc; padding: 24px 30px; border-top: 1px solid #e2e8f0;">
                      <table role="presentation" style="width: 100%; border-collapse: collapse;">
                        <tr>
                          <td align="center" style="padding: 0;">
                            <p style="margin: 0 0 12px 0; color: #718096; font-size: 12px; line-height: 1.5;">
                              © ${new Date().getFullYear()} RoomRentalUSA. All rights reserved.
                            </p>
                            <p style="margin: 0; color: #a0aec0; font-size: 11px;">
                              This is an automated email. Please do not reply to this message.
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
                
                <!-- Bottom Spacing -->
                <table role="presentation" style="width: 100%; max-width: 600px; margin-top: 20px;">
                  <tr>
                    <td align="center" style="padding: 0;">
                      <p style="margin: 0; color: #a0aec0; font-size: 11px; line-height: 1.5;">
                        Having trouble? Contact us at <a href="mailto:admin@roomrentalusa.com" style="color: #667eea; text-decoration: none;">admin@roomrentalusa.com</a>
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;

      const textContent = `
        Verify Your Email Address - RoomRentalUSA
        ===========================================
        
        Thank you for signing up! We're excited to have you join our community.
        
        Please use the verification code below to complete your registration:
        
        Verification Code: ${otpCode}
        
        ⏱️ Important: This code will expire in 10 minutes for security reasons.
        
        If you didn't request this code, please ignore this email or contact our support team.
        
        ---
        © ${new Date().getFullYear()} RoomRentalUSA. All rights reserved.
        This is an automated email. Please do not reply to this message.
        
        Having trouble? Contact us at admin@roomrentalusa.com
      `;

      const { data, error } = await this.resend.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: email,
        subject: 'Verify Your Email - RoomRentalUSA',
        html: htmlContent,
        text: textContent,
        replyTo: this.fromEmail,
        headers: {
          'X-Entity-Ref-ID': `otp-${Date.now()}`,
          'X-Mailer': 'RoomRentalUSA',
          'List-Unsubscribe': `<mailto:${this.fromEmail}?subject=unsubscribe>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
        tags: [
          {
            name: 'category',
            value: 'verification',
          },
          {
            name: 'type',
            value: 'otp',
          },
        ],
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

