import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { RegisterWithOtpDto } from './dto/register-with-otp.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { OtpService } from '../otp/otp.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly otpService: OtpService,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user (legacy - use register-with-otp)' })
  @ApiResponse({ status: 201, description: 'User successfully registered' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('send-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send OTP code to email for registration' })
  @ApiResponse({ status: 200, description: 'OTP sent successfully' })
  @ApiResponse({ status: 400, description: 'Failed to send OTP' })
  async sendOtp(@Body() sendOtpDto: SendOtpDto) {
    const result = await this.otpService.sendOtp(
      sendOtpDto.email,
      sendOtpDto.purpose || 'registration',
    );
    return {
      success: result.success,
      message: result.message,
    };
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify OTP code' })
  @ApiResponse({ status: 200, description: 'OTP verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
  async verifyOtp(@Body() verifyOtpDto: VerifyOtpDto) {
    const isValid = await this.otpService.verifyOtp(
      verifyOtpDto.email,
      verifyOtpDto.code,
      verifyOtpDto.purpose || 'registration',
    );

    if (!isValid) {
      return {
        success: false,
        message: 'Invalid or expired OTP code',
      };
    }

    return {
      success: true,
      message: 'OTP verified successfully',
    };
  }

  @Post('register-with-otp')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user with OTP verification' })
  @ApiResponse({ status: 201, description: 'User successfully registered' })
  @ApiResponse({ status: 400, description: 'Invalid OTP or validation error' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  async registerWithOtp(@Body() registerDto: RegisterWithOtpDto) {
    return this.authService.registerWithOtp(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ status: 200, description: 'User successfully logged in' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token successfully refreshed' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    const result = await this.authService.refreshToken(refreshTokenDto.refreshToken);
    // Return in format expected by frontend
    return {
      success: true,
      data: {
        accessToken: result.data.accessToken,
      },
    };
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset' })
  @ApiResponse({ status: 200, description: 'Password reset email sent (if account exists)' })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({ status: 200, description: 'Password successfully reset' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change password (authenticated users)' })
  @ApiResponse({ status: 200, description: 'Password successfully changed' })
  @ApiResponse({ status: 401, description: 'Unauthorized or incorrect current password' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async changePassword(@Request() req: any, @Body() changePasswordDto: ChangePasswordDto) {
    return this.authService.changePassword(req.user.sub, changePasswordDto);
  }

  @Post('supabase/verify')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 3600000 } }) // 10 requests per hour (3600 seconds = 1 hour)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify Supabase Auth token and sync user' })
  @ApiResponse({ status: 200, description: 'User authenticated successfully' })
  @ApiResponse({ status: 401, description: 'Invalid token' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 429, description: 'Too many requests. Please try again later.' })
  async verifySupabaseAuth(@Body() body: { accessToken: string }) {
    if (!body.accessToken) {
      throw new BadRequestException('Access token is required');
    }
    return this.authService.handleSupabaseAuth(body.accessToken);
  }
}



