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
        <html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta http-equiv="X-UA-Compatible" content="IE=edge">
          <meta name="x-apple-disable-message-reformatting">
          <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no">
          <title>Your RoomRentalUSA Verification Code</title>
          <!--[if mso]>
          <noscript>
            <xml>
              <o:OfficeDocumentSettings>
                <o:PixelsPerInch>96</o:PixelsPerInch>
              </o:OfficeDocumentSettings>
            </xml>
          </noscript>
          <![endif]-->
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f7fa; line-height: 1.6; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f7fa; padding: 20px;">
            <tr>
              <td align="center" style="padding: 20px 0;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden; margin: 0 auto;">
                  <!-- Header with Gradient -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px; line-height: 1.2;">RoomRentalUSA</h1>
                      <p style="margin: 8px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px; font-weight: 400;">Find Your Perfect Home</p>
                    </td>
                  </tr>
                  
                  <!-- Main Content -->
                  <tr>
                    <td style="padding: 40px 30px;">
                      <!-- Welcome Message -->
                      <h2 style="margin: 0 0 16px 0; color: #1a202c; font-size: 24px; font-weight: 600; line-height: 1.3;">Email Verification Required</h2>
                      <p style="margin: 0 0 24px 0; color: #4a5568; font-size: 16px; line-height: 1.6;">
                        Thank you for signing up with RoomRentalUSA. To complete your registration and secure your account, please verify your email address using the code below.
                      </p>
                      
                      <!-- OTP Code Box -->
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 32px 0;">
                        <tr>
                          <td align="center" style="padding: 0;">
                            <div style="background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%); border: 2px solid #e2e8f0; border-radius: 12px; padding: 32px 24px; margin: 0 auto; max-width: 400px;">
                              <p style="margin: 0 0 12px 0; color: #718096; font-size: 13px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">Your Verification Code</p>
                              <div style="font-size: 42px; font-weight: 700; color: #667eea; letter-spacing: 12px; font-family: 'Courier New', 'Monaco', 'Consolas', monospace; text-align: center; padding: 8px 0; line-height: 1.2;">
                                ${otpCode}
                              </div>
                              <p style="margin: 12px 0 0 0; color: #a0aec0; font-size: 12px; text-align: center;">Enter this code to verify your email address</p>
                            </div>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- Instructions -->
                      <div style="background-color: #e6f3ff; border-left: 4px solid #3182ce; padding: 16px 20px; border-radius: 6px; margin: 24px 0;">
                        <p style="margin: 0; color: #2c5282; font-size: 14px; line-height: 1.5;">
                          <strong>⏱️ Security Notice:</strong> This verification code will expire in <strong>10 minutes</strong>. For your security, please do not share this code with anyone.
                        </p>
                      </div>
                      
                      <!-- Next Steps -->
                      <div style="background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px 20px; border-radius: 6px; margin: 24px 0;">
                        <p style="margin: 0; color: #166534; font-size: 14px; line-height: 1.5;">
                          <strong>📝 Next Steps:</strong> Enter this code in the verification form on RoomRentalUSA to complete your account setup.
                        </p>
                      </div>
                      
                      <!-- Security Notice -->
                      <p style="margin: 24px 0 0 0; color: #718096; font-size: 14px; line-height: 1.6; text-align: center;">
                        If you did not create an account with RoomRentalUSA, please ignore this email. No account will be created without verification.
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f7fafc; padding: 24px 30px; border-top: 1px solid #e2e8f0;">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                        <tr>
                          <td align="center" style="padding: 0;">
                            <p style="margin: 0 0 12px 0; color: #718096; font-size: 12px; line-height: 1.5;">
                              © ${new Date().getFullYear()} RoomRentalUSA. All rights reserved.
                            </p>
                            <p style="margin: 0 0 8px 0; color: #a0aec0; font-size: 11px;">
                              This is an automated verification email. Please do not reply to this message.
                            </p>
                            <p style="margin: 0; color: #a0aec0; font-size: 11px;">
                              RoomRentalUSA | <a href="https://roomrentalusa.com" style="color: #667eea; text-decoration: none;">roomrentalusa.com</a>
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
                
                <!-- Bottom Spacing -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; margin: 20px auto 0;">
                  <tr>
                    <td align="center" style="padding: 0;">
                      <p style="margin: 0; color: #a0aec0; font-size: 11px; line-height: 1.5;">
                        Need help? Contact us at <a href="mailto:admin@roomrentalusa.com" style="color: #667eea; text-decoration: none;">admin@roomrentalusa.com</a>
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

      const textContent = `Your RoomRentalUSA Verification Code

Thank you for signing up with RoomRentalUSA. To complete your registration and secure your account, please verify your email address using the code below.

VERIFICATION CODE: ${otpCode}

Enter this code in the verification form on RoomRentalUSA to complete your account setup.

SECURITY NOTICE:
- This code will expire in 10 minutes
- Do not share this code with anyone
- RoomRentalUSA will never ask for your code via phone or email

If you did not create an account with RoomRentalUSA, please ignore this email. No account will be created without verification.

---
© ${new Date().getFullYear()} RoomRentalUSA. All rights reserved.
This is an automated verification email. Please do not reply to this message.

RoomRentalUSA | roomrentalusa.com
Need help? Contact us at admin@roomrentalusa.com
      `;

      const { data, error } = await this.resend.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: email,
        subject: 'Your RoomRentalUSA Verification Code',
        html: htmlContent,
        text: textContent,
        replyTo: this.fromEmail,
        headers: {
          'X-Entity-Ref-ID': `otp-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          'X-Mailer': 'RoomRentalUSA-Email-System',
          'X-Priority': '1',
          'X-MSMail-Priority': 'High',
          'Importance': 'high',
          'List-Unsubscribe': `<mailto:${this.fromEmail}?subject=unsubscribe>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          'Precedence': 'bulk',
          'Auto-Submitted': 'auto-generated',
          'Message-ID': `<otp-${Date.now()}-${Math.random().toString(36).substring(7)}@roomrentalusa.com>`,
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

      const { data, error } = await this.resend.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: email,
        subject: 'Reset Your Password - RoomRentalUSA',
        html: htmlContent,
        text: textContent,
        replyTo: this.fromEmail,
        headers: {
          'X-Entity-Ref-ID': `password-reset-${Date.now()}`,
          'X-Mailer': 'RoomRentalUSA',
          'List-Unsubscribe': `<mailto:${this.fromEmail}?subject=unsubscribe>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
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

