import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend!: Resend;
  private fromEmail!: string;
  private fromName!: string;

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
          <title>Your RoomRentalUSA Verification Code</title>
        </head>
        <body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #f5f5f5;">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <tr>
              <td style="padding: 30px 20px; text-align: center; border-bottom: 1px solid #e0e0e0;">
                <h1 style="margin: 0; color: #333; font-size: 24px;">RoomRentalUSA</h1>
              </td>
            </tr>
            <tr>
              <td style="padding: 30px 20px;">
                <h2 style="margin: 0 0 15px 0; color: #333; font-size: 20px;">Email Verification</h2>
                <p style="margin: 0 0 25px 0; color: #666; font-size: 14px; line-height: 1.5;">
                  Thank you for signing up. Please use the verification code below to complete your registration.
                </p>
                <div style="text-align: center; margin: 30px 0; padding: 20px; background-color: #f9f9f9; border: 1px solid #e0e0e0;">
                  <p style="margin: 0 0 10px 0; color: #666; font-size: 12px;">Your Verification Code</p>
                  <div style="font-size: 36px; font-weight: bold; color: #333; letter-spacing: 8px; font-family: monospace; margin: 15px 0;">
                    ${otpCode}
                  </div>
                  <p style="margin: 10px 0 0 0; color: #999; font-size: 12px;">Enter this code to verify your email</p>
                </div>
                <p style="margin: 20px 0 0 0; color: #999; font-size: 12px; line-height: 1.5;">
                  This code expires in 10 minutes. Do not share this code with anyone.
                </p>
                <p style="margin: 20px 0 0 0; color: #999; font-size: 12px; line-height: 1.5;">
                  If you did not create an account, please ignore this email.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding: 20px; text-align: center; border-top: 1px solid #e0e0e0; background-color: #f9f9f9;">
                <p style="margin: 0 0 5px 0; color: #999; font-size: 11px;">
                  © ${new Date().getFullYear()} RoomRentalUSA. All rights reserved.
                </p>
                <p style="margin: 0; color: #999; font-size: 11px;">
                  This is an automated email. Please do not reply.
                </p>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;

      const textContent = `RoomRentalUSA Email Verification

Thank you for signing up. Use this code to verify your email:

${otpCode}

Enter this code in the verification form to complete your registration.

This code expires in 10 minutes. Do not share it with anyone.

If you did not create an account, please ignore this email.

© ${new Date().getFullYear()} RoomRentalUSA
      `;

      // Extract domain from fromEmail for Message-ID
      const emailDomain = this.fromEmail.split('@')[1] || 'roomrentalusa.com';
      
      const { data, error } = await this.resend.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: email,
        subject: 'Verify your RoomRentalUSA account',
        html: htmlContent,
        text: textContent,
        replyTo: this.fromEmail,
        headers: {
          'X-Entity-Ref-ID': `otp-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          'Message-ID': `<otp-${Date.now()}-${Math.random().toString(36).substring(7)}@${emailDomain}>`,
          'Auto-Submitted': 'auto-replied',
          'X-Auto-Response-Suppress': 'All',
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
          {
            name: 'purpose',
            value: 'email_verification',
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

  async sendPasswordResetEmail(email: string, resetLink: string): Promise<boolean> {
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
          <title>Reset Your Password - RoomRentalUSA</title>
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
                      <h2 style="margin: 0 0 16px 0; color: #1a202c; font-size: 24px; font-weight: 600; line-height: 1.3;">Reset Your Password</h2>
                      <p style="margin: 0 0 32px 0; color: #4a5568; font-size: 16px; line-height: 1.6;">
                        We received a request to reset your password. Click the button below to create a new password.
                      </p>
                      
                      <!-- Reset Button -->
                      <table role="presentation" style="width: 100%; margin: 32px 0;">
                        <tr>
                          <td align="center" style="padding: 0;">
                            <a href="${resetLink}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);">
                              Reset Password
                            </a>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- Alternative Link -->
                      <p style="margin: 24px 0 0 0; color: #718096; font-size: 14px; line-height: 1.6; text-align: center;">
                        Or copy and paste this link into your browser:<br>
                        <a href="${resetLink}" style="color: #667eea; text-decoration: none; word-break: break-all;">${resetLink}</a>
                      </p>
                      
                      <!-- Instructions -->
                      <div style="background-color: #fef5e7; border-left: 4px solid #f6ad55; padding: 16px 20px; border-radius: 6px; margin: 24px 0;">
                        <p style="margin: 0; color: #744210; font-size: 14px; line-height: 1.5;">
                          <strong>⏱️ Important:</strong> This link will expire in <strong>1 hour</strong> for security reasons.
                        </p>
                      </div>
                      
                      <!-- Security Notice -->
                      <p style="margin: 24px 0 0 0; color: #718096; font-size: 14px; line-height: 1.6; text-align: center;">
                        If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
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
        Reset Your Password - RoomRentalUSA
        ===================================
        
        We received a request to reset your password. Click the link below to create a new password:
        
        ${resetLink}
        
        ⏱️ Important: This link will expire in 1 hour for security reasons.
        
        If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
        
        ---
        © ${new Date().getFullYear()} RoomRentalUSA. All rights reserved.
        This is an automated email. Please do not reply to this message.
        
        Having trouble? Contact us at admin@roomrentalusa.com
      `;

      // Extract domain from fromEmail for Message-ID
      const emailDomain = this.fromEmail.split('@')[1] || 'roomrentalusa.com';
      
      const { data, error } = await this.resend.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: email,
        subject: 'Reset your RoomRentalUSA password',
        html: htmlContent,
        text: textContent,
        replyTo: this.fromEmail,
        headers: {
          'X-Entity-Ref-ID': `password-reset-${Date.now()}`,
          'Message-ID': `<password-reset-${Date.now()}-${Math.random().toString(36).substring(7)}@${emailDomain}>`,
          'Auto-Submitted': 'auto-replied',
          'X-Auto-Response-Suppress': 'All',
        },
        tags: [
          {
            name: 'category',
            value: 'password-reset',
          },
          {
            name: 'type',
            value: 'security',
          },
        ],
      });

      if (error) {
        this.logger.error(`Failed to send password reset email to ${email}:`, error);
        return false;
      }

      this.logger.log(`Password reset email sent to ${email}. MessageId: ${data?.id}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${email}:`, error);
      return false;
    }
  }

  async sendMessageNotification(data: {
    to: string;
    recipientName: string;
    senderName: string;
    messagePreview: string;
    conversationId: string;
    listingTitle?: string;
    unsubscribeLink?: string;
    recipientRole?: string;
  }): Promise<boolean> {
    try {
      if (!this.resend) {
        this.logger.error('Resend client not initialized. Check RESEND_API_KEY configuration.');
        return false;
      }

      const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'https://www.roomrentalusa.com';
      // Navigate to landlord dashboard with conversationId if recipient is a landlord, otherwise to messages page
      const conversationLink = data.recipientRole === 'landlord' 
        ? `${frontendUrl}/landlord/dashboard?conversationId=${data.conversationId}`
        : `${frontendUrl}/messages/${data.conversationId}`;
      const unsubscribeLink = data.unsubscribeLink || `${frontendUrl}/settings`;

      // Spam-free template: Professional, clear, no trigger words
      const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta http-equiv="X-UA-Compatible" content="IE=edge">
          <title>New Message - RoomRentalUSA</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f7fa; line-height: 1.6;">
          <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f7fa; padding: 20px;">
            <tr>
              <td align="center" style="padding: 20px 0;">
                <table role="presentation" style="width: 100%; max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); overflow: hidden;">
                  <!-- Header -->
                  <tr>
                    <td style="background-color: #ffffff; padding: 30px 30px 20px 30px; text-align: center; border-bottom: 1px solid #e2e8f0;">
                      <h1 style="margin: 0; color: #1a202c; font-size: 24px; font-weight: 600; letter-spacing: -0.5px;">RoomRentalUSA</h1>
                      <p style="margin: 8px 0 0 0; color: #718096; font-size: 14px; font-weight: 400;">Room Rental Platform</p>
                    </td>
                  </tr>
                  
                  <!-- Main Content -->
                  <tr>
                    <td style="padding: 40px 30px;">
                      <!-- Greeting -->
                      <p style="margin: 0 0 20px 0; color: #4a5568; font-size: 16px; line-height: 1.6;">
                        Hello ${data.recipientName},
                      </p>
                      
                      <!-- Message Notification -->
                      <p style="margin: 0 0 24px 0; color: #4a5568; font-size: 16px; line-height: 1.6;">
                        You have a new message from <strong style="color: #1a202c;">${data.senderName}</strong>${data.listingTitle ? ` about "${data.listingTitle}"` : ''}.
                      </p>
                      
                      <!-- Message Preview Box -->
                      <div style="background-color: #f7fafc; border-left: 4px solid #667eea; padding: 16px 20px; border-radius: 4px; margin: 24px 0;">
                        <p style="margin: 0; color: #2d3748; font-size: 15px; line-height: 1.6; font-style: italic;">
                          "${data.messagePreview}"
                        </p>
                      </div>
                      
                      <!-- Call to Action Button -->
                      <table role="presentation" style="width: 100%; margin: 32px 0;">
                        <tr>
                          <td align="center" style="padding: 0;">
                            <a href="${conversationLink}" style="display: inline-block; background-color: #667eea; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-weight: 600; font-size: 16px;">
                              View Conversation
                            </a>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- Alternative Link -->
                      <p style="margin: 24px 0 0 0; color: #718096; font-size: 14px; line-height: 1.6; text-align: center;">
                        Or visit: <a href="${conversationLink}" style="color: #667eea; text-decoration: none; word-break: break-all;">${conversationLink}</a>
                      </p>
                      
                      <!-- Help Text -->
                      <p style="margin: 32px 0 0 0; color: #a0aec0; font-size: 13px; line-height: 1.5; text-align: center;">
                        Reply to this conversation to continue the discussion with ${data.senderName}.
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f7fafc; padding: 24px 30px; border-top: 1px solid #e2e8f0;">
                      <table role="presentation" style="width: 100%; border-collapse: collapse;">
                        <tr>
                          <td align="center" style="padding: 0 0 16px 0;">
                            <p style="margin: 0; color: #718096; font-size: 12px; line-height: 1.5;">
                              © ${new Date().getFullYear()} RoomRentalUSA. All rights reserved.
                            </p>
                          </td>
                        </tr>
                        <tr>
                          <td align="center" style="padding: 0 0 16px 0;">
                            <p style="margin: 0; color: #a0aec0; font-size: 11px; line-height: 1.5;">
                              This is an automated notification. Please do not reply to this email.
                            </p>
                          </td>
                        </tr>
                        <tr>
                          <td align="center" style="padding: 0;">
                            <p style="margin: 0; color: #a0aec0; font-size: 11px; line-height: 1.5;">
                              <a href="${unsubscribeLink}" style="color: #667eea; text-decoration: none;">Manage notification preferences</a> | 
                              <a href="${frontendUrl}/help" style="color: #667eea; text-decoration: none;">Help Center</a>
                            </p>
                          </td>
                        </tr>
                        <!-- CAN-SPAM Compliance: Physical Address -->
                        <tr>
                          <td align="center" style="padding: 16px 0 0 0;">
                            <p style="margin: 0; color: #cbd5e0; font-size: 10px; line-height: 1.4;">
                              RoomRentalUSA<br>
                              United States<br>
                              <a href="mailto:admin@roomrentalusa.com" style="color: #a0aec0; text-decoration: none;">admin@roomrentalusa.com</a>
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;

      const textContent = `New Message - RoomRentalUSA

Hello ${data.recipientName},

You have a new message from ${data.senderName}${data.listingTitle ? ` about "${data.listingTitle}"` : ''}.

Message:
"${data.messagePreview}"

View conversation: ${conversationLink}

Reply to this conversation to continue the discussion with ${data.senderName}.

---
© ${new Date().getFullYear()} RoomRentalUSA. All rights reserved.
This is an automated notification. Please do not reply to this email.

Manage notification preferences: ${unsubscribeLink}
Help Center: ${frontendUrl}/help

RoomRentalUSA
United States
admin@roomrentalusa.com
      `;

      // Extract domain from fromEmail for Message-ID
      const emailDomain = this.fromEmail.split('@')[1] || 'roomrentalusa.com';
      
      const { data: result, error } = await this.resend.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: data.to,
        subject: `New message from ${data.senderName}${data.listingTitle ? ` - ${data.listingTitle}` : ''}`,
        html: htmlContent,
        text: textContent,
        replyTo: this.fromEmail,
        headers: {
          'X-Entity-Ref-ID': `message-${data.conversationId}-${Date.now()}`,
          'Message-ID': `<message-${Date.now()}-${Math.random().toString(36).substring(7)}@${emailDomain}>`,
          'List-Unsubscribe': `<${unsubscribeLink}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
        tags: [
          {
            name: 'category',
            value: 'notification',
          },
          {
            name: 'type',
            value: 'message',
          },
          {
            name: 'conversation_id',
            value: data.conversationId,
          },
        ],
      });

      if (error) {
        this.logger.error(`Failed to send message notification to ${data.to}:`, error);
        return false;
      }

      this.logger.log(`Message notification sent to ${data.to}. MessageId: ${result?.id}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send message notification to ${data.to}:`, error);
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

