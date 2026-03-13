import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { JwtAuthGuard } from '../guards/jwt-guard';

const REFRESH_COOKIE = 'refresh_token';
const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  path: '/',
};

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /api/auth/signup
   * Body: { name, email, password }
   * Returns: { user, token }  — token is the short-lived JWT access token.
   * A long-lived refresh token is also set as an httpOnly cookie.
   */
  @Post('signup')
  async signup(
    @Body() body: { name: string; email: string; password: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    console.log(body)
    const { user, token, refreshToken } = await this.authService.signUp(
      body.name,
      body.email,
      body.password,
    );
    res.cookie(REFRESH_COOKIE, refreshToken, COOKIE_OPTS);
    return { user, token };
  }

  /**
   * POST /api/auth/login
   * Body: { email, password }
   * Returns: { user, token }
   */
  @Post('login')
  async login(
    @Body() body: { email: string; password: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, token, refreshToken } = await this.authService.login(
      body.email,
      body.password,
    );
    res.cookie(REFRESH_COOKIE, refreshToken, COOKIE_OPTS);
    return { user, token };
  }

  /**
   * GET /api/auth/me
   * Uses the refresh token cookie to verify session and returns a fresh
   * access token + user. The frontend calls this on load to restore session.
   * Returns: { user, token }
   */
  @Get('me')
  async me(@Req() req: Request) {
    const refreshToken = req.cookies?.[REFRESH_COOKIE];
    return this.authService.me(refreshToken);
  }

  /**
   * POST /api/auth/logout
   * Revokes the refresh token and clears the cookie.
   */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(
    @Req() req: Request & { user: { id: string } },
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(req.user.id);
    res.clearCookie(REFRESH_COOKIE, { path: '/' });
    return { ok: true };
  }

  /**
   * POST /api/auth/forgot-password
   * Body: { email }
   * Always returns 200 (no user enumeration).
   */
  @Post('forgot-password')
  async forgotPassword(@Body() body: { email: string }) {
    await this.authService.forgotPassword(body.email);
    return { message: 'If that email exists, a reset link has been sent.' };
  }

  /**
   * POST /api/auth/reset-password
   * Body: { token, password }
   */
  @Post('reset-password')
  async resetPassword(@Body() body: { token: string; password: string }) {
    await this.authService.resetPassword(body.token, body.password);
    return { message: 'Password reset successfully.' };
  }

  /**
   * GET /api/auth/google
   * Redirects the browser to Google's consent screen.
   */
  @Get('google')
  googleAuth(@Res() res: Response) {
    res.redirect(this.authService.getGoogleAuthUrl());
  }

  /**
   * POST /api/auth/google/callback
   * Body: { code, state }
   * The frontend SPA calls this after Google redirects back with the code.
   * Returns: { user, token }
   */
  @Post('google/callback')
  async googleCallback(
    @Body() body: { code: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, token, refreshToken } =
      await this.authService.handleGoogleCallback(body.code);
    res.cookie(REFRESH_COOKIE, refreshToken, COOKIE_OPTS);
    return { user, token };
  }
}
