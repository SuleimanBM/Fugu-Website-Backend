import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { EntityManager } from '@mikro-orm/postgresql';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import axios from 'axios';
import { UserService } from './user.service';
import { EmailService } from './email.service';
import { User } from '../entities/user.entity';
import { Role } from '../enums/roles.enum';
import { generateToken } from '../msic/generateToken';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    private readonly em: EntityManager,
  ) {}

  /** Signs an access token (short-lived) */
  private signAccess(user: User) {
    return this.jwtService.sign(
      { id: user.id, email: user.email, role: user.role },
      { expiresIn: '15m' },
    );
  }

  /** Signs a refresh token (long-lived) — stored as hash on User */
  private signRefresh(user: User) {
    return this.jwtService.sign(
      { id: user.id },
      { secret: process.env.JWT_REFRESH_SECRET, expiresIn: '30d' },
    );
  }

  // ── SIGNUP ──────────────────────────────────────────────────────────────

  async signUp(name: string, email: string, password: string) {
    if (await this.userService.getByEmail(email)) {
      throw new BadRequestException('Email already in use');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = this.em.create(User, { name, email, passwordHash });
    await this.em.flush();

    // Fire-and-forget welcome email
    this.emailService
      .sendSignupEmail(user.email, { name: user.name, verifyLink: '' })
      .catch(() => {});

    const token = this.signAccess(user);
    const refreshToken = this.signRefresh(user);
    user.refreshTokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');
    await this.em.flush();

    return { user: user.toDto(), token, refreshToken };
  }

  // ── LOGIN ────────────────────────────────────────────────────────────────

  async login(email: string, password: string) {
    const user = await this.userService.getByEmail(email);
    if (!user || !user.passwordHash) {
      throw new BadRequestException('Invalid credentials');
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) throw new BadRequestException('Invalid credentials');

    const token = this.signAccess(user);
    const refreshToken = this.signRefresh(user);
    user.refreshTokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');
    await this.em.flush();

    return { user: user.toDto(), token, refreshToken };
  }

  // ── /auth/me (uses refresh cookie to re-issue access token) ──────────────

  async me(refreshToken: string) {
    if (!refreshToken) throw new UnauthorizedException('No refresh token');

    let payload: { id: string };
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.userService.getById(payload.id);
    if (!user) throw new UnauthorizedException('User not found');

    const expectedHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');
    if (user.refreshTokenHash !== expectedHash) {
      throw new UnauthorizedException('Refresh token revoked');
    }

    const token = this.signAccess(user);
    return { user: user.toDto(), token };
  }

  // ── LOGOUT ───────────────────────────────────────────────────────────────

  async logout(userId: string) {
    const user = await this.userService.getById(userId);
    if (user) {
      user.refreshTokenHash = null;
      await this.em.flush();
    }
  }

  // ── FORGOT PASSWORD ──────────────────────────────────────────────────────

  async forgotPassword(email: string) {
    const user = await this.userService.getByEmail(email);
    if (!user) return; // silent — avoid user enumeration

    const { raw, hashed } = generateToken();
    user.passwordResetToken = hashed;
    user.passwordResetExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min
    await this.em.flush();

    await this.emailService.sendResetPasswordEmail(user.email, {
      name: user.name,
      resetLink: `${process.env.APP_URL}/reset-password?token=${raw}`,
    });
  }

  // ── RESET PASSWORD ───────────────────────────────────────────────────────

  async resetPassword(token: string, password: string) {
    const hashed = crypto.createHash('sha256').update(token).digest('hex');
    const user = await this.em.findOne(User, {
      passwordResetToken: hashed,
      passwordResetExpiresAt: { $gt: new Date() },
    });

    if (!user) throw new BadRequestException('Invalid or expired token');

    user.passwordHash = await bcrypt.hash(password, 10);
    user.passwordResetToken = null;
    user.passwordResetExpiresAt = null;
    await this.em.flush();
  }

  // ── GOOGLE OAUTH (frontend-callback flow) ────────────────────────────────

  /**
   * Builds the Google OAuth URL to redirect the browser to.
   * The redirect_uri points to the FRONTEND callback page, which will then
   * call handleGoogleCallback() with the code.
   */
  getGoogleAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      redirect_uri: `${process.env.FRONTEND_URL}/auth/google/callback`,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'select_account',
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }

  /**
   * Exchanges the auth code for Google user info, then finds or creates the
   * local user and returns { user, token } — same shape as email login.
   */
  async handleGoogleCallback(code: string) {
    // 1. Exchange code for tokens
    const tokenRes = await axios
      .post('https://oauth2.googleapis.com/token', {
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: `${process.env.FRONTEND_URL}/auth/google/callback`,
        grant_type: 'authorization_code',
      })
      .catch(() => {
        throw new BadRequestException('Failed to exchange Google auth code');
      });

    const idToken = tokenRes.data.id_token;

    // 2. Fetch user info from Google
    const userInfoRes = await axios
      .get('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokenRes.data.access_token}` },
      })
      .catch(() => {
        throw new BadRequestException('Failed to fetch Google user info');
      });

    const { sub: googleId, email, name } = userInfoRes.data;

    // 3. Find or create user
    let user = await this.em.findOne(User, { $or: [{ googleId }, { email }] });

    if (!user) {
      user = this.em.create(User, {
        name: name ?? email,
        email,
        googleId,
        role: Role.CUSTOMER,
      });
    } else {
      // Link Google ID if they previously signed up with email
      if (!user.googleId) user.googleId = googleId;
    }

    const token = this.signAccess(user);
    const refreshToken = this.signRefresh(user);
    user.refreshTokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');
    await this.em.flush();

    return { user: user.toDto(), token, refreshToken };
  }
}
