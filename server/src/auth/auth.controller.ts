import {
  Controller,
  Post,
  Get,
  Body,
  Res,
  Req,
  UseGuards,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { Response, Request } from 'express';
import { AuthService, RegisterDto, LoginDto } from './auth.service';
import { AuthGuard } from './auth.guard';
import { authConfig } from './auth.config';
import { AuthenticatedRequest } from '../common/types/request.types';

@ApiTags('Auth')
@Controller('api/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'John Doe' },
        email: { type: 'string', example: 'john@example.com' },
        password: { type: 'string', example: 'password123' },
      },
      required: ['email', 'password'],
    },
  })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.register(dto);

    // Set cookies
    res.cookie('accessToken', result.tokens.accessToken, {
      ...authConfig.cookieOptions,
      maxAge: 15 * 60 * 1000, // 15 minutes
    });
    res.cookie('refreshToken', result.tokens.refreshToken, {
      ...authConfig.cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return result;
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', example: 'john@example.com' },
        password: { type: 'string', example: 'password123' },
      },
      required: ['email', 'password'],
    },
  })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto);

    // Set cookies
    res.cookie('accessToken', result.tokens.accessToken, {
      ...authConfig.cookieOptions,
      maxAge: 15 * 60 * 1000, // 15 minutes
    });
    res.cookie('refreshToken', result.tokens.refreshToken, {
      ...authConfig.cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return result;
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        refreshToken: {
          type: 'string',
          description: 'Refresh token (optional if sent via cookie)',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Tokens refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

    const tokens = await this.authService.refreshTokens(refreshToken);

    // Set new cookies
    res.cookie('accessToken', tokens.accessToken, {
      ...authConfig.cookieOptions,
      maxAge: 15 * 60 * 1000, // 15 minutes
    });
    res.cookie('refreshToken', tokens.refreshToken, {
      ...authConfig.cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return { tokens };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout and revoke refresh token' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.refreshToken;

    await this.authService.logout(refreshToken);

    // Clear cookies
    res.clearCookie('accessToken', authConfig.cookieOptions);
    res.clearCookie('refreshToken', authConfig.cookieOptions);

    return { message: 'Logged out successfully' };
  }

  @Post('logout-all')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Logout from all devices' })
  @ApiResponse({ status: 200, description: 'Logged out from all devices' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logoutAll(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logoutAll(req.user.id);

    // Clear cookies
    res.clearCookie('accessToken', authConfig.cookieOptions);
    res.clearCookie('refreshToken', authConfig.cookieOptions);

    return { message: 'Logged out from all devices successfully' };
  }

  @Get('google')
  @ApiOperation({ summary: 'Initiate Google OAuth login' })
  @ApiResponse({ status: 302, description: 'Redirects to Google OAuth' })
  googleAuth(@Res() res: Response) {
    const url = this.authService.getGoogleAuthUrl();
    res.redirect(url);
  }

  @Get('google/status')
  @ApiOperation({ summary: 'Check Google OAuth configuration status' })
  @ApiResponse({
    status: 200,
    description: 'Returns OAuth configuration status',
  })
  googleAuthStatus() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const callbackUrl = process.env.GOOGLE_CALLBACK_URL;
    const frontendUrl = process.env.FRONTEND_URL;

    return {
      configured: !!(clientId && clientSecret),
      clientIdSet: !!clientId,
      clientSecretSet: !!clientSecret,
      callbackUrl:
        callbackUrl ||
        'http://localhost:3000/api/auth/google/callback (default)',
      frontendUrl: frontendUrl || 'http://localhost:3001 (default)',
      nodeEnv: process.env.NODE_ENV || 'development',
    };
  }

  @Get('demo')
  @ApiOperation({ summary: 'Login as demo user with pre-populated data' })
  @ApiResponse({
    status: 200,
    description:
      'Demo user authenticated with sample categories, transactions, and budgets',
  })
  async demoAuth(@Res({ passthrough: true }) res: Response) {
    const result = await this.authService.getDemoUser();

    // Set cookies
    res.cookie('accessToken', result.tokens.accessToken, {
      ...authConfig.cookieOptions,
      maxAge: 15 * 60 * 1000, // 15 minutes
    });
    res.cookie('refreshToken', result.tokens.refreshToken, {
      ...authConfig.cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return result;
  }

  @Get('google/callback')
  @ApiOperation({ summary: 'Google OAuth callback handler' })
  @ApiResponse({
    status: 302,
    description: 'Redirects to frontend with tokens in cookies',
  })
  async googleCallback(
    @Query('code') code: string,
    @Query('error') error: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';

    // Handle OAuth errors (user denied access, etc.)
    if (error) {
      console.error('Google OAuth error:', error);
      res.redirect(
        `${frontendUrl}/auth/callback?error=${encodeURIComponent(error)}`,
      );
      return;
    }

    if (!code) {
      console.error('Google OAuth: No code received');
      res.redirect(
        `${frontendUrl}/auth/callback?error=${encodeURIComponent('No authorization code received')}`,
      );
      return;
    }

    try {
      const result = await this.authService.handleGoogleCallback(code);

      // Set cookies
      res.cookie('accessToken', result.tokens.accessToken, {
        ...authConfig.cookieOptions,
        maxAge: 15 * 60 * 1000,
      });
      res.cookie('refreshToken', result.tokens.refreshToken, {
        ...authConfig.cookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      // Redirect to frontend auth callback with success flag
      res.redirect(`${frontendUrl}/auth/callback?success=true`);
    } catch (err) {
      console.error('Google OAuth callback error:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Authentication failed';
      res.redirect(
        `${frontendUrl}/auth/callback?error=${encodeURIComponent(errorMessage)}`,
      );
    }
  }
}

@ApiTags('User')
@Controller('api/user')
export class UserController {
  @Get('me')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get current authenticated user' })
  @ApiResponse({ status: 200, description: 'Returns user details' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getCurrentUser(@Req() req: AuthenticatedRequest) {
    return {
      user: req.user,
    };
  }
}
