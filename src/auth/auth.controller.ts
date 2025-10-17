import { Controller, Post, Body, Get, Query, Res, HttpCode, HttpStatus, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/RegisterDto';
import { LoginDto } from "@/auth/dto/LoginDto";
import { RequestPasswordResetDto, ResetPasswordDto, VerifyResetTokenDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/email-verification.dto';
import { GoogleAuthService } from './google.service';
import { Response } from 'express';
import {JwtAuthGuard} from "@/auth/jwt-auth.guard";

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
    constructor(
        private readonly googleService: GoogleAuthService,
        private readonly authService: AuthService
    ) {}

    @Post('register')
    async register(@Body() dto: RegisterDto) {
        return this.authService.register(dto);
    }

    @Post('login')
    @HttpCode(HttpStatus.OK)
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

    @Post('send-verification-code')
    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    async sendVerificationCode(@Req() req: any) {
        return this.authService.sendVerificationCodeByUserId(req.user.userId);
    }

    @Post('verify-email')
    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    async verifyEmail(@Req() req: any, @Body() dto: VerifyEmailDto) {
        return this.authService.verifyEmailByUserId(req.user.userId, dto.code);
    }

    @Get('verification-status')
    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    async checkVerificationStatus(@Req() req: any) {
        return this.authService.checkVerificationStatusByUserId(req.user.userId);
    }

    @Post('request-password-reset')
    @HttpCode(HttpStatus.OK)
    async requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
        return this.authService.requestPasswordReset(dto);
    }

    @Post('verify-reset-token')
    @HttpCode(HttpStatus.OK)
    async verifyResetToken(@Body() dto: VerifyResetTokenDto) {
        return this.authService.verifyResetToken(dto.token);
    }

    @Post('reset-password')
    @HttpCode(HttpStatus.OK)
    async resetPassword(@Body() dto: ResetPasswordDto) {
        return this.authService.resetPassword(dto);
    }
}