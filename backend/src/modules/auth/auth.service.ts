import {
  Injectable, UnauthorizedException, ConflictException,
  BadRequestException, OnModuleInit, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { User, UserRole } from './entities/user.entity';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);
  private readonly resendKey: string;

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {
    this.resendKey = config.get<string>('RESEND_API_KEY', '');
  }

  async onModuleInit() {
    const email = this.config.get<string>('ADMIN_EMAIL', 'admin@thefamgroup.uk');

    // Migrate legacy seed email if it still exists
    const legacy = await this.userRepo.findOne({ where: { email: 'admin@thefamgroup.co.uk' } });
    if (legacy && legacy.email !== email) {
      await this.userRepo.update(legacy.id, { email });
      this.logger.log(`Admin email migrated: admin@thefamgroup.co.uk → ${email}`);
    }

    const exists = await this.userRepo.findOne({ where: { email } });
    if (!exists) {
      const password = this.config.get<string>('ADMIN_PASSWORD', 'Admin@123!');
      await this.createUser({ email, password, firstName: 'Admin', lastName: 'FAM', role: UserRole.ADMIN });
      this.logger.log(`Admin user seeded: ${email}`);
    }
  }

  async login(dto: LoginDto) {
    const user = await this.userRepo.findOne({
      where: { email: dto.email.toLowerCase() },
      select: ['id', 'email', 'password', 'firstName', 'lastName', 'role', 'isActive'],
    });

    if (!user || !user.isActive) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.userRepo.findOne({ where: { email: email.toLowerCase() } });
    if (!user) return; // silent — don't reveal whether email exists

    const token = crypto.randomUUID();
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.userRepo.update(user.id, { resetToken: token, resetTokenExpiry: expiry });

    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:3001');
    const resetLink = `${frontendUrl}/auth/reset-password?token=${token}`;

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.resendKey}`,
        },
        body: JSON.stringify({
          from: 'thefamgroup Admin <noreply@thefamgroup.uk>',
          to: [user.email],
          subject: 'Reset your password — thefamgroup Admin',
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
              <h2 style="color:#3a7d44">thefamgroup Admin</h2>
              <p>Hi ${user.firstName},</p>
              <p>We received a request to reset your admin password.</p>
              <p style="margin:24px 0">
                <a href="${resetLink}" style="background:#3a7d44;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">
                  Reset Password
                </a>
              </p>
              <p style="color:#666;font-size:14px">This link expires in 1 hour. If you didn't request a reset, ignore this email.</p>
              <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
              <p style="color:#999;font-size:12px">thefamgroup Admin · Family. Community. Care.</p>
            </div>
          `,
        }),
      });
      if (res.ok) {
        this.logger.log(`Password reset email sent to ${user.email}`);
      } else {
        const err = await res.json().catch(() => ({}));
        this.logger.error(`Failed to send reset email to ${user.email}: ${JSON.stringify(err)}`);
      }
    } catch (err) {
      this.logger.error(`Failed to send reset email to ${user.email}: ${err}`);
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await this.userRepo.findOne({ where: { resetToken: token } });
    if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
      throw new BadRequestException('Invalid or expired reset link. Please request a new one.');
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await this.userRepo.update(user.id, {
      password: hashed,
      resetToken: null,
      resetTokenExpiry: null,
    });
  }

  async createUser(data: {
    email: string; password: string;
    firstName: string; lastName: string; role?: UserRole;
  }) {
    const exists = await this.userRepo.findOne({ where: { email: data.email } });
    if (exists) throw new ConflictException('Email already in use');

    const hashed = await bcrypt.hash(data.password, 12);
    const user = this.userRepo.create({ ...data, password: hashed });
    return this.userRepo.save(user);
  }

  async findById(id: string) {
    return this.userRepo.findOne({ where: { id } });
  }

  async getProfile(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    return user;
  }
}
