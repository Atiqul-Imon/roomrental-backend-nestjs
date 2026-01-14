import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private readonly OTP_EXPIRY_MINUTES = 10;
  private readonly OTP_LENGTH = 6;

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  /**
   * Generate a random 6-digit OTP code
   */
  private generateOtpCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Send OTP to email address
   */
  async sendOtp(email: string, purpose: string = 'registration'): Promise<{ success: boolean; message: string }> {
    try {
      // Check if there's an unexpired OTP for this email
      const existingOtp = await this.prisma.otp.findFirst({
        where: {
          email,
          purpose,
          verified: false,
          expiresAt: {
            gt: new Date(),
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      let otpCode: string;
      let otpRecord;

      if (existingOtp && existingOtp.expiresAt > new Date()) {
        // Reuse existing unexpired OTP
        otpCode = existingOtp.code;
        otpRecord = existingOtp;
        this.logger.log(`Reusing existing OTP for ${email}`);
      } else {
        // Generate new OTP
        otpCode = this.generateOtpCode();
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + this.OTP_EXPIRY_MINUTES);

        // Delete old unverified OTPs for this email and purpose
        await this.prisma.otp.deleteMany({
          where: {
            email,
            purpose,
            verified: false,
          },
        });

        // Create new OTP record
        otpRecord = await this.prisma.otp.create({
          data: {
            email,
            code: otpCode,
            purpose,
            expiresAt,
          },
        });

        this.logger.log(`Generated new OTP for ${email}`);
      }

      // Send OTP via email
      const emailSent = await this.emailService.sendOtpEmail(email, otpCode);

      if (!emailSent) {
        // Delete the OTP record if email failed
        await this.prisma.otp.delete({
          where: { id: otpRecord.id },
        });
        throw new BadRequestException('Failed to send OTP email. Please try again.');
      }

      return {
        success: true,
        message: 'OTP sent successfully. Please check your email.',
      };
    } catch (error) {
      this.logger.error(`Error sending OTP to ${email}:`, error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to send OTP. Please try again.');
    }
  }

  /**
   * Verify OTP code
   */
  async verifyOtp(email: string, code: string, purpose: string = 'registration'): Promise<boolean> {
    try {
      const otp = await this.prisma.otp.findFirst({
        where: {
          email,
          code,
          purpose,
          verified: false,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (!otp) {
        this.logger.warn(`Invalid OTP code for ${email}`);
        return false;
      }

      if (otp.expiresAt < new Date()) {
        this.logger.warn(`Expired OTP code for ${email}`);
        // Delete expired OTP
        await this.prisma.otp.delete({
          where: { id: otp.id },
        });
        return false;
      }

      // Mark OTP as verified
      await this.prisma.otp.update({
        where: { id: otp.id },
        data: { verified: true },
      });

      this.logger.log(`OTP verified successfully for ${email}`);
      return true;
    } catch (error) {
      this.logger.error(`Error verifying OTP for ${email}:`, error);
      return false;
    }
  }

  /**
   * Clean up expired OTPs (can be called by a cron job)
   */
  async cleanupExpiredOtps(): Promise<number> {
    try {
      const result = await this.prisma.otp.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });

      this.logger.log(`Cleaned up ${result.count} expired OTPs`);
      return result.count;
    } catch (error) {
      this.logger.error('Error cleaning up expired OTPs:', error);
      return 0;
    }
  }
}

