import {Controller, Post, Body, Get, Query, Res} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/RegisterDto';
import { LoginDto } from "@/auth/dto/LoginDto";
import { GoogleAuthService } from './google.service';
import { Response } from 'express';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly googleService: GoogleAuthService, private readonly authService: AuthService) {
  }

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('google')
  async getGoogleAuthUrl() {
    return this.googleService.getAuthUrl();
  }

  @Get('google/callback')
  async handleGoogleCallback(@Query('code') code: string, @Res() res: Response) {
    try {
      const jwt = await this.googleService.handleCallback(code);
      const frontendUrl = `${process.env.FRONTEND_URL}/auth/callback?token=${jwt}`;
      return res.redirect(frontendUrl);
    } catch (error) {
      console.error('Google auth error:', error);
      return res.redirect(`${process.env.FRONTEND_URL}/auth/error`);
    }
  }
}