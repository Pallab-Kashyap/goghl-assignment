import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { generateTokens, verifyRefreshToken, TokenPair } from './auth.config';

export interface RegisterDto {
  name?: string;
  email: string;
  password: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
  tokens: TokenPair;
}

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        accounts: {
          create: {
            accountId: dto.email,
            providerId: 'credentials',
            password: hashedPassword,
          },
        },
      },
    });

    const tokens = generateTokens(user.id, user.email);

    // Store refresh token
    await this.prisma.refreshToken.create({
      data: {
        token: tokens.refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
      },
      tokens,
    };
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        accounts: {
          where: { providerId: 'credentials' },
        },
      },
    });

    if (!user || !user.accounts[0]?.password) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.accounts[0].password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const tokens = generateTokens(user.id, user.email);

    // Store refresh token
    await this.prisma.refreshToken.create({
      data: {
        token: tokens.refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
      },
      tokens,
    };
  }

  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    const payload = verifyRefreshToken(refreshToken);

    if (!payload) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Check if refresh token exists in database
    const storedToken = await this.prisma.refreshToken.findFirst({
      where: {
        token: refreshToken,
        userId: payload.userId,
        expiresAt: { gt: new Date() },
        revokedAt: null,
      },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Refresh token not found or expired');
    }

    // Revoke the old refresh token
    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    // Generate new tokens
    const tokens = generateTokens(payload.userId, payload.email);

    // Store new refresh token
    await this.prisma.refreshToken.create({
      data: {
        token: tokens.refreshToken,
        userId: payload.userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    return tokens;
  }

  async logout(refreshToken: string): Promise<void> {
    if (!refreshToken) {
      return;
    }

    // Revoke the refresh token
    await this.prisma.refreshToken.updateMany({
      where: { token: refreshToken },
      data: { revokedAt: new Date() },
    });
  }

  async logoutAll(userId: string): Promise<void> {
    // Revoke all refresh tokens for the user
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  getGoogleAuthUrl(): string {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri =
      process.env.GOOGLE_CALLBACK_URL ||
      'http://localhost:3000/api/auth/google/callback';
    const scope = encodeURIComponent('email profile');

    if (!clientId) {
      throw new BadRequestException(
        'Google OAuth is not configured: GOOGLE_CLIENT_ID is missing',
      );
    }

    // Include prompt=consent to always show the consent screen
    // This ensures proper OAuth flow in production
    return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`;
  }

  async handleGoogleCallback(code: string): Promise<AuthResponse> {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri =
      process.env.GOOGLE_CALLBACK_URL ||
      'http://localhost:3000/api/auth/google/callback';

    console.log('Google OAuth callback:', {
      redirectUri,
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
      codeLength: code?.length || 0,
    });

    if (!clientId || !clientSecret) {
      throw new BadRequestException('Google OAuth is not configured properly');
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('Google token exchange failed:', tokenData);
      throw new BadRequestException(
        `Failed to exchange code for tokens: ${tokenData.error_description || tokenData.error || 'Unknown error'}`,
      );
    }

    // Get user info from Google
    const userInfoResponse = await fetch(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      },
    );

    const googleUser = await userInfoResponse.json();

    if (!userInfoResponse.ok) {
      throw new BadRequestException('Failed to get user info from Google');
    }

    // Find or create user
    let user = await this.prisma.user.findUnique({
      where: { email: googleUser.email },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: googleUser.email,
          name: googleUser.name,
          image: googleUser.picture,
          emailVerified: new Date(),
          accounts: {
            create: {
              accountId: googleUser.id,
              providerId: 'google',
              accessToken: tokenData.access_token,
              refreshToken: tokenData.refresh_token,
              accessTokenExpiresAt: new Date(
                Date.now() + tokenData.expires_in * 1000,
              ),
            },
          },
        },
      });
    } else {
      // Update or create Google account
      await this.prisma.account.upsert({
        where: {
          id: `${user.id}_google`,
        },
        create: {
          userId: user.id,
          accountId: googleUser.id,
          providerId: 'google',
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          accessTokenExpiresAt: new Date(
            Date.now() + tokenData.expires_in * 1000,
          ),
        },
        update: {
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          accessTokenExpiresAt: new Date(
            Date.now() + tokenData.expires_in * 1000,
          ),
        },
      });
    }

    const tokens = generateTokens(user.id, user.email);

    // Store refresh token
    await this.prisma.refreshToken.create({
      data: {
        token: tokens.refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
      },
      tokens,
    };
  }

  async getDemoUser(): Promise<AuthResponse> {
    const demoEmail = 'demo@user.in';
    const demoPassword = 'demo123456';

    // Check if demo user exists
    let user = await this.prisma.user.findUnique({
      where: { email: demoEmail },
    });

    if (!user) {
      // Create demo user with dummy data
      const hashedPassword = await bcrypt.hash(demoPassword, 10);

      user = await this.prisma.user.create({
        data: {
          name: 'Demo User',
          email: demoEmail,
          accounts: {
            create: {
              accountId: demoEmail,
              providerId: 'credentials',
              password: hashedPassword,
            },
          },
        },
      });

      // Create expense categories
      const groceriesCategory = await this.prisma.category.create({
        data: {
          name: 'Groceries',
          type: 'EXPENSE',
          icon: '🛒',
          color: '#FF5733',
          userId: user.id,
        },
      });

      const transportCategory = await this.prisma.category.create({
        data: {
          name: 'Transport',
          type: 'EXPENSE',
          icon: '🚗',
          color: '#3498DB',
          userId: user.id,
        },
      });

      const entertainmentCategory = await this.prisma.category.create({
        data: {
          name: 'Entertainment',
          type: 'EXPENSE',
          icon: '🎬',
          color: '#9B59B6',
          userId: user.id,
        },
      });

      const utilitiesCategory = await this.prisma.category.create({
        data: {
          name: 'Utilities',
          type: 'EXPENSE',
          icon: '💡',
          color: '#F39C12',
          userId: user.id,
        },
      });

      // Create income categories
      const salaryCategory = await this.prisma.category.create({
        data: {
          name: 'Salary',
          type: 'INCOME',
          icon: '💰',
          color: '#27AE60',
          userId: user.id,
        },
      });

      const freelanceCategory = await this.prisma.category.create({
        data: {
          name: 'Freelance',
          type: 'INCOME',
          icon: '💻',
          color: '#2ECC71',
          userId: user.id,
        },
      });

      // Get current date info for budgets
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      // Create budgets
      await this.prisma.budget.createMany({
        data: [
          {
            amount: 500,
            month: currentMonth,
            year: currentYear,
            categoryId: groceriesCategory.id,
            userId: user.id,
          },
          {
            amount: 200,
            month: currentMonth,
            year: currentYear,
            categoryId: transportCategory.id,
            userId: user.id,
          },
          {
            amount: 150,
            month: currentMonth,
            year: currentYear,
            categoryId: entertainmentCategory.id,
            userId: user.id,
          },
        ],
      });

      // Create dummy transactions (last 30 days)
      const transactions = [
        // Income transactions
        {
          amount: 5000,
          type: 'INCOME' as const,
          description: 'Monthly Salary',
          date: new Date(currentYear, currentMonth - 1, 1),
          categoryId: salaryCategory.id,
          userId: user.id,
        },
        {
          amount: 800,
          type: 'INCOME' as const,
          description: 'Freelance Project',
          date: new Date(currentYear, currentMonth - 1, 10),
          categoryId: freelanceCategory.id,
          userId: user.id,
        },
        // Expense transactions
        {
          amount: 150,
          type: 'EXPENSE' as const,
          description: 'Weekly groceries',
          date: new Date(currentYear, currentMonth - 1, 3),
          categoryId: groceriesCategory.id,
          userId: user.id,
        },
        {
          amount: 85,
          type: 'EXPENSE' as const,
          description: 'Grocery shopping',
          date: new Date(currentYear, currentMonth - 1, 10),
          categoryId: groceriesCategory.id,
          userId: user.id,
        },
        {
          amount: 120,
          type: 'EXPENSE' as const,
          description: 'Supermarket run',
          date: new Date(currentYear, currentMonth - 1, 17),
          categoryId: groceriesCategory.id,
          userId: user.id,
        },
        {
          amount: 50,
          type: 'EXPENSE' as const,
          description: 'Gas refill',
          date: new Date(currentYear, currentMonth - 1, 5),
          categoryId: transportCategory.id,
          userId: user.id,
        },
        {
          amount: 35,
          type: 'EXPENSE' as const,
          description: 'Uber rides',
          date: new Date(currentYear, currentMonth - 1, 12),
          categoryId: transportCategory.id,
          userId: user.id,
        },
        {
          amount: 45,
          type: 'EXPENSE' as const,
          description: 'Movie tickets',
          date: new Date(currentYear, currentMonth - 1, 8),
          categoryId: entertainmentCategory.id,
          userId: user.id,
        },
        {
          amount: 30,
          type: 'EXPENSE' as const,
          description: 'Netflix subscription',
          date: new Date(currentYear, currentMonth - 1, 1),
          categoryId: entertainmentCategory.id,
          userId: user.id,
        },
        {
          amount: 95,
          type: 'EXPENSE' as const,
          description: 'Electricity bill',
          date: new Date(currentYear, currentMonth - 1, 15),
          categoryId: utilitiesCategory.id,
          userId: user.id,
        },
        {
          amount: 45,
          type: 'EXPENSE' as const,
          description: 'Internet bill',
          date: new Date(currentYear, currentMonth - 1, 15),
          categoryId: utilitiesCategory.id,
          userId: user.id,
        },
      ];

      await this.prisma.transaction.createMany({
        data: transactions,
      });
    }

    // Generate tokens for demo user
    const tokens = generateTokens(user.id, user.email);

    // Store refresh token
    await this.prisma.refreshToken.create({
      data: {
        token: tokens.refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
      },
      tokens,
    };
  }
}
