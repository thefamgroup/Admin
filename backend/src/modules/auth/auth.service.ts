import {
  Injectable, UnauthorizedException, ConflictException,
  BadRequestException, NotFoundException, OnModuleInit, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { User, UserRole } from './entities/user.entity';
import { LoginDto } from './dto/login.dto';

export const ALL_PERMISSIONS = ['dashboard', 'inbox', 'bookings', 'quotes', 'leads', 'team', 'settings', 'users'];

export const ROLE_PRESETS: Record<string, string[]> = {
  admin:   ALL_PERMISSIONS,
  manager: ['dashboard', 'inbox', 'bookings', 'quotes', 'leads', 'team'],
  staff:   ['dashboard', 'inbox', 'bookings'],
};

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);
  private readonly resendKey: string;
  private readonly frontendUrl: string;

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {
    this.resendKey   = config.get<string>('RESEND_API_KEY', '');
    this.frontendUrl = config.get<string>('FRONTEND_URL', 'http://localhost:3001');
  }

  async onModuleInit() {
    const email = this.config.get<string>('ADMIN_EMAIL', 'admin@thefamgroup.uk');
    const password = this.config.get<string>('ADMIN_PASSWORD', 'Admin@123!');

    // Migrate any previous seed email to the currently configured one
    const legacyEmails = ['admin@thefamgroup.co.uk', 'admin@thefamgroup.uk'];
    for (const old of legacyEmails) {
      if (old === email) continue;
      const legacy = await this.userRepo.findOne({ where: { email: old } });
      if (legacy) {
        await this.userRepo.update(legacy.id, { email, permissions: ALL_PERMISSIONS });
        this.logger.log(`Admin email migrated: ${old} → ${email}`);
      }
    }

    const exists = await this.userRepo.findOne({ where: { email } });
    if (!exists) {
      await this.createUser({ email, password, firstName: 'Admin', lastName: 'FAM', role: UserRole.ADMIN, permissions: ALL_PERMISSIONS });
      this.logger.log(`Admin user seeded: ${email}`);
    } else if (!exists.permissions?.length) {
      await this.userRepo.update(exists.id, { permissions: ALL_PERMISSIONS });
      this.logger.log(`Admin permissions backfilled for ${email}`);
    }
  }

  async login(dto: LoginDto) {
    const user = await this.userRepo.findOne({
      where: { email: dto.email.toLowerCase() },
      select: ['id', 'email', 'password', 'firstName', 'lastName', 'role', 'isActive', 'permissions'],
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
        permissions: user.permissions ?? [],
      },
    };
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.userRepo.findOne({ where: { email: email.toLowerCase() } });
    if (!user) return;

    const token = crypto.randomUUID();
    const expiry = new Date(Date.now() + 60 * 60 * 1000);
    await this.userRepo.update(user.id, { resetToken: token, resetTokenExpiry: expiry });

    const resetLink = `${this.frontendUrl}/auth/reset-password?token=${token}`;
    await this.sendEmail(user.email, 'Reset your password — thefamgroup Admin', `
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
    `);
    this.logger.log(`Password reset email sent to ${user.email}`);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await this.userRepo.findOne({ where: { resetToken: token } });
    if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
      throw new BadRequestException('Invalid or expired reset link. Please request a new one.');
    }
    const hashed = await bcrypt.hash(newPassword, 12);
    await this.userRepo.update(user.id, { password: hashed, resetToken: null, resetTokenExpiry: null });
  }

  // ── User management ──────────────────────────────────────────────────────

  listUsers() {
    return this.userRepo.find({ order: { createdAt: 'ASC' } });
  }

  async inviteUser(data: { email: string; firstName: string; lastName: string; role: UserRole; permissions: string[] }) {
    const existing = await this.userRepo.findOne({ where: { email: data.email.toLowerCase() } });
    if (existing) throw new ConflictException('A user with this email already exists');

    const token = crypto.randomUUID();
    const expiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days to accept invite

    const tempHash = await bcrypt.hash(crypto.randomUUID(), 12); // locked until they set password
    const user = await this.userRepo.save(this.userRepo.create({
      email: data.email.toLowerCase(),
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role,
      permissions: data.permissions,
      password: tempHash,
      resetToken: token,
      resetTokenExpiry: expiry,
      isActive: false, // activated on first password set
    }));

    const inviteLink = `${this.frontendUrl}/auth/reset-password?token=${token}&invite=1`;
    await this.sendEmail(user.email, `You've been invited to thefamgroup Admin`, `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h2 style="color:#3a7d44">thefamgroup Admin</h2>
        <p>Hi ${user.firstName},</p>
        <p>You've been invited to manage the thefamgroup admin panel.</p>
        <p>Click the button below to set your password and activate your account:</p>
        <p style="margin:24px 0">
          <a href="${inviteLink}" style="background:#3a7d44;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">
            Accept Invite & Set Password
          </a>
        </p>
        <p style="color:#666;font-size:14px">This link expires in 7 days.</p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
        <p style="color:#999;font-size:12px">thefamgroup Admin · Family. Community. Care.</p>
      </div>
    `);
    this.logger.log(`Invite sent to ${user.email}`);
    return { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role, permissions: user.permissions };
  }

  async updateUserPermissions(id: string, permissions: string[], role?: UserRole) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    await this.userRepo.update(id, { permissions, ...(role ? { role } : {}) });
    return { ...user, permissions, ...(role ? { role } : {}) };
  }

  async toggleUserActive(id: string, isActive: boolean) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    await this.userRepo.update(id, { isActive });
    return { ...user, isActive };
  }

  async deleteUser(id: string, requestingUserId: string) {
    if (id === requestingUserId) throw new BadRequestException('You cannot delete your own account');
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    await this.userRepo.remove(user);
    return { ok: true };
  }

  // ── Accept invite — activates account on first password set ──────────────

  async acceptInvite(token: string, newPassword: string): Promise<void> {
    const user = await this.userRepo.findOne({ where: { resetToken: token } });
    if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
      throw new BadRequestException('Invalid or expired invite link. Please ask to be re-invited.');
    }
    const hashed = await bcrypt.hash(newPassword, 12);
    await this.userRepo.update(user.id, {
      password: hashed,
      resetToken: null,
      resetTokenExpiry: null,
      isActive: true,
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  async createUser(data: {
    email: string; password: string;
    firstName: string; lastName: string; role?: UserRole; permissions?: string[];
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

  private async sendEmail(to: string, subject: string, html: string): Promise<void> {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.resendKey}` },
        body: JSON.stringify({ from: 'thefamgroup Admin <noreply@thefamgroup.uk>', to: [to], subject, html }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        this.logger.error(`Email send failed to ${to}: ${JSON.stringify(err)}`);
      }
    } catch (err) {
      this.logger.error(`Email send error to ${to}: ${err}`);
    }
  }
}
