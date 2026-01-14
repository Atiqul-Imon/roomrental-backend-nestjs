import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { hashPassword, verifyPassword, needsRehash } from '../common/utils/password.util';
import { RegisterDto } from './dto/register.dto';
import { RegisterWithOtpDto } from './dto/register-with-otp.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { OtpService } from '../otp/otp.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private otpService: OtpService,
  ) {}

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

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
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



