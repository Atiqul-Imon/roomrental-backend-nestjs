import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { hashPassword, verifyPassword, needsRehash } from '../common/utils/password.util';
import { RegisterDto } from './dto/register.dto';
import { RegisterWithOtpDto } from './dto/register-with-otp.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { OtpService } from '../otp/otp.service';
import { EmailService } from '../email/email.service';
import { SupabaseService } from './supabase.service';
import { logger } from '../common/utils/logger';
import * as crypto from 'crypto';

/**
 * Authentication Service
 * 
 * Handles all authentication and authorization logic including:
 * - User registration and login
 * - OTP-based registration and verification
 * - Password management (reset, change)
 * - JWT token generation and refresh
 * - Supabase OAuth integration
 * 
 * @class AuthService
 */
@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private otpService: OtpService,
    private emailService: EmailService,
    private supabaseService: SupabaseService,
  ) {}

  /**
   * Register a new user (Legacy method)
   * 
   * Legacy registration method kept for backward compatibility.
   * New registrations should use registerWithOtp for better security.
   * 
   * @param {RegisterDto} registerDto - Registration data (email, password, name, role)
   * @returns {Promise<{success: boolean, data: {user: User, tokens: Tokens}}>}
   *   Created user and authentication tokens
   * @throws {ConflictException} If user with email already exists
   * 
   * @deprecated Use registerWithOtp instead for better security
   */
  async register(registerDto: RegisterDto) {
    // Legacy register method - kept for backward compatibility
    // New registration should use registerWithOtp
    const { email, password, name, role } = registerDto;

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const passwordHash = await hashPassword(password);

    const user = await this.prisma.user.create({
      data: {
        email,
        password: passwordHash,
        name,
        role: role || 'student',
        emailVerified: false, // Legacy registration doesn't verify email
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        profileImage: true,
        bio: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const tokens = this.generateTokens(user.id, user.email, user.role);

    return {
      success: true,
      data: {
        user,
        tokens: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        },
      },
    };
  }

  /**
   * Register a new user with OTP verification
   * 
   * Preferred registration method that requires email OTP verification.
   * Verifies the OTP code before creating the user account.
   * Sends welcome email after successful registration.
   * 
   * @param {RegisterWithOtpDto} registerDto - Registration data including OTP code
   * @returns {Promise<{success: boolean, data: {user: User, tokens: Tokens}}>}
   *   Created user and authentication tokens
   * @throws {BadRequestException} If OTP is invalid or expired
   * @throws {ConflictException} If user with email already exists
   * 
   * @example
   * ```typescript
   * const result = await authService.registerWithOtp({
   *   email: 'user@example.com',
   *   password: 'SecurePass123!',
   *   name: 'John Doe',
   *   otpCode: '123456'
   * });
   * ```
   */
  async registerWithOtp(registerDto: RegisterWithOtpDto) {
    const { email, password, name, role, otpCode } = registerDto;

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Verify OTP
    const isOtpValid = await this.otpService.verifyOtp(email, otpCode, 'registration');

    if (!isOtpValid) {
      throw new BadRequestException('Invalid or expired OTP code. Please request a new one.');
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user with email verified
    const user = await this.prisma.user.create({
      data: {
        email,
        password: passwordHash,
        name,
        role: role || 'student',
        emailVerified: true, // Email is verified via OTP
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        profileImage: true,
        bio: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const tokens = this.generateTokens(user.id, user.email, user.role);

    return {
      success: true,
      data: {
        user,
        tokens: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        },
      },
    };
  }

  /**
   * Authenticate user and generate JWT tokens
   * 
   * Validates user credentials and returns access and refresh tokens.
   * Automatically rehashes password if using old bcrypt format (migration to Argon2).
   * 
   * @param {LoginDto} loginDto - Login credentials (email and password)
   * @returns {Promise<{success: boolean, data: {user: User, tokens: Tokens}}>}
   *   Authenticated user and JWT tokens
   * @throws {UnauthorizedException} If credentials are invalid
   * 
   * @example
   * ```typescript
   * const result = await authService.login({
   *   email: 'user@example.com',
   *   password: 'SecurePass123!'
   * });
   * ```
   */
  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await verifyPassword(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Rehash password if needed (migration from bcrypt to Argon2)
    if (needsRehash(user.password)) {
      const newHash = await hashPassword(password);
      await this.prisma.user.update({
        where: { id: user.id },
        data: { password: newHash },
      });
    }

    const tokens = this.generateTokens(user.id, user.email, user.role);

    const userResponse = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      profileImage: user.profileImage,
      bio: user.bio,
    };

    return {
      success: true,
      data: {
        user: userResponse,
        tokens: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        },
      },
    };
  }

  /**
   * Refresh access token using refresh token
   * 
   * Validates the refresh token and generates a new access token.
   * Used to maintain user session without requiring re-authentication.
   * 
   * @param {string} refreshToken - Valid refresh token
   * @returns {Promise<{success: boolean, data: {accessToken: string}}>} New access token
   * @throws {UnauthorizedException} If refresh token is invalid or expired
   * 
   * @example
   * ```typescript
   * const result = await authService.refreshToken('refresh-token-string');
   * // Returns new access token
   * ```
   */
  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET') || 'your-refresh-secret',
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      const tokens = this.generateTokens(user.id, user.email, user.role);

      return {
        success: true,
        data: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        },
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { email } = forgotPasswordDto;
    const normalizedEmail = email.trim().toLowerCase();

    // Check if user exists (but don't reveal if they don't)
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // Rate limiting: Check recent requests (last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentRequests = await this.prisma.passwordResetToken.count({
      where: {
        email: normalizedEmail,
        createdAt: {
          gte: oneHourAgo,
        },
      },
    });

    if (recentRequests >= 3) {
      // Don't reveal if user exists - just return success
      return {
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.',
      };
    }

    // Only send email if user exists
    if (user) {
      // Generate secure random token
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Invalidate any existing tokens for this email
      await this.prisma.passwordResetToken.updateMany({
        where: {
          email: normalizedEmail,
          used: false,
        },
        data: {
          used: true,
        },
      });

      // Create new reset token
      const resetToken = await this.prisma.passwordResetToken.create({
        data: {
          email: normalizedEmail,
          token,
          expiresAt,
        },
      });

      // Generate reset link
      const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
      const resetLink = `${frontendUrl}/auth/reset-password?token=${token}&email=${encodeURIComponent(normalizedEmail)}`;

      // Send email - if it fails, delete the token we just created
      const emailSent = await this.emailService.sendPasswordResetEmail(normalizedEmail, resetLink);
      
      if (!emailSent) {
        // Rollback: delete token if email failed
        await this.prisma.passwordResetToken.delete({
          where: { id: resetToken.id },
        });
        // Log error but still return success (don't reveal email exists)
        logger.error(`Failed to send password reset email to ${normalizedEmail}`);
      }
    }

    // Always return success (don't reveal if email exists)
    return {
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.',
    };
  }

  /**
   * Reset password using reset token
   * 
   * Validates the reset token and updates user password.
   * Token must be valid and not expired (1 hour expiration).
   * 
   * @param {ResetPasswordDto} resetPasswordDto - Reset token, email, and new password
   * @returns {Promise<{success: boolean, message: string}>} Success confirmation
   * @throws {BadRequestException} If token is invalid or expired
   * @throws {NotFoundException} If user doesn't exist
   * 
   * @example
   * ```typescript
   * await authService.resetPassword({
   *   email: 'user@example.com',
   *   token: 'reset-token',
   *   newPassword: 'NewSecurePass123!'
   * });
   * ```
   */
  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { email, token, newPassword } = resetPasswordDto;
    const normalizedEmail = email.trim().toLowerCase();

    // Find valid token
    const resetToken = await this.prisma.passwordResetToken.findFirst({
      where: {
        email: normalizedEmail,
        token,
        used: false,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!resetToken) {
      throw new BadRequestException('Invalid or expired reset token. Please request a new password reset.');
    }

    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Validate password strength
    this.validatePasswordStrength(newPassword);

    // Hash new password
    const passwordHash = await hashPassword(newPassword);

    // Update user password
    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: passwordHash },
    });

    // Mark token as used
    await this.prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { used: true },
    });

    // Invalidate all existing tokens for this email (security: prevent reuse)
    await this.prisma.passwordResetToken.updateMany({
      where: {
        email: normalizedEmail,
        used: false,
      },
      data: {
        used: true,
      },
    });

    return {
      success: true,
      message: 'Password has been reset successfully. You can now login with your new password.',
    };
  }

  /**
   * Change password for authenticated user
   * 
   * Allows authenticated users to change their password.
   * Requires current password for verification.
   * 
   * @param {string} userId - ID of the user changing password
   * @param {ChangePasswordDto} changePasswordDto - Current and new password
   * @returns {Promise<{success: boolean, message: string}>} Success confirmation
   * @throws {UnauthorizedException} If current password is incorrect
   * @throws {BadRequestException} If new password is same as current
   * 
   * @example
   * ```typescript
   * await authService.changePassword('user-id', {
   *   currentPassword: 'OldPass123!',
   *   newPassword: 'NewSecurePass123!'
   * });
   * ```
   */
  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const { currentPassword, newPassword } = changePasswordDto;

    // Get user
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.password) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    const isPasswordValid = await verifyPassword(currentPassword, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Check if new password is same as current
    const isSamePassword = await verifyPassword(newPassword, user.password);
    if (isSamePassword) {
      throw new BadRequestException('New password must be different from current password');
    }

    // Validate password strength
    this.validatePasswordStrength(newPassword);

    // Hash new password
    const passwordHash = await hashPassword(newPassword);

    // Update password
    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: passwordHash },
    });

    // Note: In a production system, you might want to:
    // 1. Invalidate all refresh tokens for this user
    // 2. Log the password change event
    // 3. Send a notification email about the password change
    // For now, the frontend will handle logout after password change

    return {
      success: true,
      message: 'Password has been changed successfully. Please log in again with your new password.',
    };
  }

  private validatePasswordStrength(password: string): void {
    if (password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters long');
    }

    if (password.length > 128) {
      throw new BadRequestException('Password must be less than 128 characters');
    }

    // Check for at least one uppercase letter
    if (!/[A-Z]/.test(password)) {
      throw new BadRequestException('Password must contain at least one uppercase letter');
    }

    // Check for at least one lowercase letter
    if (!/[a-z]/.test(password)) {
      throw new BadRequestException('Password must contain at least one lowercase letter');
    }

    // Check for at least one number
    if (!/[0-9]/.test(password)) {
      throw new BadRequestException('Password must contain at least one number');
    }
  }

  async handleSupabaseAuth(accessToken: string) {
    try {
      // Verify Supabase token and get user
      const supabaseAuthData = await this.supabaseService.verifyToken(accessToken);
      const supabaseUser = supabaseAuthData.user;

      if (!supabaseUser) {
        throw new UnauthorizedException('Invalid Supabase authentication token');
      }

      // Extract user data from Supabase
      const email = supabaseUser.email?.trim().toLowerCase();
      if (!email) {
        throw new BadRequestException('Email not provided by OAuth provider');
      }

      const name = supabaseUser.user_metadata?.full_name || 
                   supabaseUser.user_metadata?.name || 
                   email.split('@')[0];
      const profileImage = supabaseUser.user_metadata?.avatar_url || 
                          supabaseUser.user_metadata?.picture;
      const provider = supabaseUser.app_metadata?.provider || 'google';
      const emailVerified = supabaseUser.email_confirmed_at !== null;

      // Find or create user in your database
      // First check by supabaseUserId (most specific)
      // Then check by email (for account linking)
      let user = await this.prisma.user.findFirst({
        where: {
          OR: [
            { supabaseUserId: supabaseUser.id }, // Exact Supabase user match
            { email }, // Email match for account linking
          ],
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          profileImage: true,
          supabaseUserId: true,
          oauthProvider: true,
          emailVerified: true,
          password: true,
        },
      });

      let isNewUser = false;
      let wasAccountLinked = false;

      if (!user) {
        // Create new user (database trigger should handle this, but create as fallback)
        isNewUser = true;
        wasAccountLinked = false; // New user, not linking
        user = await this.prisma.user.create({
          data: {
            email,
            name,
            profileImage,
            supabaseUserId: supabaseUser.id,
            oauthProvider: provider,
            emailVerified,
            role: 'student',
            password: null, // OAuth users don't have passwords
          },
        });
      } else {
        // Existing user found - linking OAuth account
        // Check if this is their first OAuth login (account linking)
        const existingUser = await this.prisma.user.findUnique({
          where: { id: user.id },
          select: {
            supabaseUserId: true,
            oauthProvider: true,
            profileImage: true,
            name: true,
            role: true,
            password: true,
            emailVerified: true,
          },
        });
        
        // Determine if this is first OAuth linking
        const isLinkingOAuth = !existingUser?.supabaseUserId || !existingUser?.oauthProvider;
        
        // Check if user already has an active account with password (email/password registration)
        // If user has a password, they've completed email/password registration - skip role selection
        const hasActivePasswordAccount = !!existingUser?.password;
        
        // isNewUser = true only if:
        // - This is their first OAuth login (linking OAuth to account), AND
        // - They don't have a password (account was auto-created by trigger, never completed setup)
        // Existing users with passwords linking OAuth should NOT go through role selection
        isNewUser = isLinkingOAuth && !hasActivePasswordAccount;
        
        // Determine if this was account linking (existing user with password linking OAuth)
        wasAccountLinked = isLinkingOAuth && !!existingUser?.password;
        
        // Security check: If user found by email but has different supabaseUserId, prevent linking
        // This prevents account takeover if someone tries to link an OAuth account to an existing email
        if (user.supabaseUserId && user.supabaseUserId !== supabaseUser.id) {
          throw new UnauthorizedException(
            'This email is already associated with a different account. Please use the original login method.'
          );
        }
        
        // Update existing user with Supabase info (account linking)
        // Note: We preserve their existing password so they can still login with email/password
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: {
            supabaseUserId: supabaseUser.id,
            oauthProvider: provider,
            emailVerified: emailVerified || existingUser?.emailVerified || false,
            profileImage: profileImage || existingUser?.profileImage || null,
            name: name || existingUser?.name || null,
            // DO NOT update password - preserve existing password for email/password login
          },
        });
      }

      // Generate your JWT tokens
      const tokens = this.generateTokens(user.id, user.email, user.role);

      // Log for debugging
      logger.log('[OAuth] User authenticated', {
        userId: user.id,
        email: user.email,
        role: user.role,
        isNewUser,
        wasAccountLinked,
        hasPassword: !!user.password,
      });

      return {
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            profileImage: user.profileImage,
            emailVerified: user.emailVerified,
          },
          tokens: {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
          },
          isNewUser, // Flag to indicate if this is a new OAuth user (needs role selection)
          accountLinked: wasAccountLinked, // Flag to indicate if existing account was linked
        },
      };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof BadRequestException) {
        throw error;
      }
      // Log the full error for debugging
      logger.error('Supabase Auth Error', error);
      throw new UnauthorizedException(
        `Failed to authenticate with Supabase: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private generateTokens(userId: string, email: string, role: string) {
    const payload: JwtPayload = {
      sub: userId,
      email,
      role,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET') || 'your-secret-key',
      expiresIn: this.configService.get<string>('JWT_EXPIRE') || '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET') || 'your-refresh-secret',
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRE') || '7d',
    });

    return {
      accessToken,
      refreshToken,
    };
  }
}



