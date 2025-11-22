import {
    BadRequestException,
    Inject,
    Injectable,
    Logger,
    NotFoundException,
    UnauthorizedException
} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {Repository} from 'typeorm';
import * as bcrypt from 'bcrypt';
import {UserEntity} from '@/common/entities/user.entity';
import {RegisterDto} from './dto/register.dto';
import {JwtService} from '@nestjs/jwt';
import {LoginDto} from "@/auth/dto/login.dto";
import {RequestPasswordResetDto, ResetPasswordDto} from './dto/reset-password.dto';
import {EmailService} from '@/email/email.service';
import {generatePasswordResetEmailTemplate} from '@/email/templates/password-reset.template';
import {generatePasswordChangedEmailTemplate} from '@/email/templates/password-changed.template';
import {generateEmailVerificationTemplate} from '@/email/templates/email-verification.template';
import {UserDto} from "@/common/dto/user.dto";
import {getAbsoluteUrl} from "@/common/utils/url.util";
import {REQUEST} from "@nestjs/core";
import {Request} from "express";

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);
    private readonly RATE_LIMIT_MINUTES: number = 10;
    private readonly VERIFICATION_CODE_EXPIRY_MINUTES: number = 10;
    private readonly PASSWORD_RESET_TOKEN_EXPIRY_MINUTES: number = 60;
    private readonly PASSWORD_RESET_TOKEN_TYPE: string = 'password-reset';

    constructor(
        @InjectRepository(UserEntity)
        private readonly userRepo: Repository<UserEntity>,
        private readonly jwtService: JwtService,
        private readonly emailService: EmailService,
        @Inject(REQUEST) private readonly request: Request,
    ) {
    }

    private generateVerificationCode(): string {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    private mapToUserDto(user: UserEntity): UserDto {
        return {
            userId: user.userId,
            email: user.email,
            name: user.name,
            photoUrl: getAbsoluteUrl(this.request, user.photoUrl),
            isEmailVerified: user.isEmailVerified,
        };
    }

    async register(dto: RegisterDto) {
        const existing = await this.userRepo.findOne({where: {email: dto.email}});
        if (existing) throw new BadRequestException('Email already registered');

        const hashedPassword = await bcrypt.hash(dto.password, 10);
        const user = this.userRepo.create({
            name: dto.name,
            email: dto.email,
            password: hashedPassword
        });
        const savedUser = await this.userRepo.save(user);

        const payload = {sub: savedUser.userId, email: savedUser.email};
        const token = this.jwtService.sign(payload);

        return {
            access_token: token,
            user: this.mapToUserDto(savedUser),
            message: 'Registration successful.'
        };
    }

    async login(dto: LoginDto) {
        const user = await this.userRepo.findOne({where: {email: dto.email}});
        if (!user) throw new UnauthorizedException('Invalid email or password');

        const isMatch = await bcrypt.compare(dto.password, user.password);
        if (!isMatch) throw new UnauthorizedException('Invalid email or password');

        const payload = {sub: user.userId, email: user.email};
        const accessToken = this.jwtService.sign(payload);

        return {
            access_token: accessToken,
            user: this.mapToUserDto(user),
        };
    }

    async sendVerificationCodeByUserId(userId: number) {
        const user = await this.userRepo.findOne({ where: { userId } });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        if (user.isEmailVerified) {
            throw new BadRequestException('Email is already verified');
        }

        if (user.emailVerificationLastRequest) {
            const now = new Date();
            const timeSinceLastRequest = now.getTime() - user.emailVerificationLastRequest.getTime();
            const rateLimitMs = this.RATE_LIMIT_MINUTES * 60 * 1000;

            if (timeSinceLastRequest < rateLimitMs) {
                const secondsLeft = Math.ceil((rateLimitMs - timeSinceLastRequest) / 1000);
                const minutesLeft = Math.ceil(secondsLeft / 60);

                this.logger.warn(
                    `Email verification rate limit for ${user.email}. Wait ${minutesLeft} more minute(s)`
                );

                throw new BadRequestException(
                    `Please wait ${minutesLeft} minute(s) before requesting a new code`
                );
            }
        }

        const code = this.generateVerificationCode();
        const expiresAt = new Date(Date.now() + this.VERIFICATION_CODE_EXPIRY_MINUTES * 60 * 1000);

        user.emailVerificationCode = code;
        user.emailVerificationCodeExpires = expiresAt;
        user.emailVerificationLastRequest = new Date();
        await this.userRepo.save(user);

        const htmlContent = generateEmailVerificationTemplate(
            user.name,
            code,
            this.VERIFICATION_CODE_EXPIRY_MINUTES
        );

        try {
            await this.emailService.sendEmail(
                user.email,
                'Email Verification Code - GoQuestly',
                htmlContent
            );

            this.logger.log(`Verification code sent to ${user.email}`);
        } catch (error) {
            this.logger.error(`Failed to send verification code to ${user.email}`, error);

            user.emailVerificationCode = null;
            user.emailVerificationCodeExpires = null;
            user.emailVerificationLastRequest = null;
            await this.userRepo.save(user);

            throw new BadRequestException('Failed to send verification code. Please try again later.');
        }

        const now = new Date();
        const canResendAt = new Date(now.getTime() + this.RATE_LIMIT_MINUTES * 60 * 1000);

        return {
            success: true,
            message: 'Verification code sent to your email',
            expires_at: expiresAt.toISOString(),
            can_resend_at: canResendAt.toISOString(),
            server_time: now.toISOString(),
        };
    }

    async verifyEmailByUserId(userId: number, code: string) {
        const user = await this.userRepo.findOne({ where: { userId } });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        if (user.isEmailVerified) {
            return {
                success: true,
                message: 'Email is already verified',
            };
        }

        if (!user.emailVerificationCode || !user.emailVerificationCodeExpires) {
            throw new BadRequestException('No verification code found. Please request a new one.');
        }

        if (user.emailVerificationCodeExpires < new Date()) {
            throw new BadRequestException('Verification code has expired. Please request a new one.');
        }

        if (user.emailVerificationCode !== code) {
            this.logger.warn(`Invalid verification code attempt for ${user.email}`);
            throw new BadRequestException('Invalid verification code');
        }

        user.isEmailVerified = true;
        user.emailVerificationCode = null;
        user.emailVerificationCodeExpires = null;
        await this.userRepo.save(user);

        this.logger.log(`Email verified successfully for ${user.email}`);

        return {
            success: true,
            message: 'Email verified successfully',
        };
    }

    async checkVerificationStatusByUserId(userId: number) {
        const user = await this.userRepo.findOne({ where: { userId } });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        const now = new Date();

        if (user.isEmailVerified) {
            return {
                is_verified: true,
            };
        }

        let canResendAt: string | null = null;
        let canResendCode = true;

        if (user.emailVerificationLastRequest) {
            const resendAvailableAt = new Date(
                user.emailVerificationLastRequest.getTime() + this.RATE_LIMIT_MINUTES * 60 * 1000
            );

            if (now < resendAvailableAt) {
                canResendCode = false;
                canResendAt = resendAvailableAt.toISOString();
            }
        }

        let codeExpiresAt: string | null = null;

        if (user.emailVerificationCodeExpires && user.emailVerificationCodeExpires > now) {
            codeExpiresAt = user.emailVerificationCodeExpires.toISOString();
        }

        return {
            is_verified: false,
            can_resend_code: canResendCode,
            can_resend_at: canResendAt,
            code_expires_at: codeExpiresAt,
            server_time: now.toISOString(),
        };
    }

    async requestPasswordReset(dto: RequestPasswordResetDto) {
        const {email} = dto;

        const user = await this.userRepo.findOne({where: {email}});

        if (!user) {
            this.logger.warn(`Password reset requested for non-existent email: ${email}`);
            return {
                success: true,
                message: 'If email exists, password reset link has been sent'
            };
        }

        if (user.resetPasswordLastRequest) {
            const now = new Date();
            const timeSinceLastRequest = now.getTime() - user.resetPasswordLastRequest.getTime();
            const rateLimitMs = this.RATE_LIMIT_MINUTES * 60 * 1000;

            if (timeSinceLastRequest < rateLimitMs) {
                const secondsLeft = Math.ceil((rateLimitMs - timeSinceLastRequest) / 1000);
                const minutesLeft = Math.ceil(secondsLeft / 60);

                this.logger.warn(`Rate limit for ${email}. Wait ${minutesLeft} more min (${secondsLeft}s)`);

                return {
                    success: true,
                    message: 'If email exists, password reset link has been sent'
                };
            }
        }

        const resetToken = this.jwtService.sign(
            {userId: user.userId, email: user.email, type: this.PASSWORD_RESET_TOKEN_TYPE},
            {
                expiresIn: `${this.PASSWORD_RESET_TOKEN_EXPIRY_MINUTES}m`,
                secret: process.env.JWT_RESET_SECRET,
            }
        );

        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = new Date(Date.now() + this.PASSWORD_RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000);
        user.resetPasswordLastRequest = new Date();
        await this.userRepo.save(user);

        const resetUrl = `${process.env.FRONTEND_URL}/change-password?token=${resetToken}`;
        const htmlContent = generatePasswordResetEmailTemplate(user.name, resetUrl);

        try {
            await this.emailService.sendEmail(
                user.email,
                'Password Reset Request - GoQuestly',
                htmlContent
            );

            this.logger.log(`Password reset email sent to ${user.email}`);
        } catch (error) {
            this.logger.error(`Failed to send password reset email to ${user.email}`, error);

            user.resetPasswordToken = null;
            user.resetPasswordExpires = null;
            user.resetPasswordLastRequest = null;
            await this.userRepo.save(user);

            throw new BadRequestException('Failed to send password reset email. Please try again later.');
        }

        return {
            success: true,
            message: 'If email exists, password reset link has been sent'
        };
    }

    async resetPassword(dto: ResetPasswordDto) {
        const {token, password} = dto;

        if (password.length < 4) {
            throw new BadRequestException('Password must be at least 4 characters long');
        }

        let payload: { type: string; userId: any; };

        try {
            payload = this.jwtService.verify(token, {
                secret: process.env.JWT_RESET_SECRET || process.env.JWT_SECRET
            });
        } catch (error) {
            throw new BadRequestException('Invalid or expired password reset token');
        }

        if (payload.type !== this.PASSWORD_RESET_TOKEN_TYPE) {
            throw new BadRequestException('Invalid token type');
        }

        const user = await this.userRepo.findOne({
            where: {userId: payload.userId}
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        if (user.resetPasswordToken !== token) {
            throw new BadRequestException('Invalid password reset token');
        }

        if (!user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
            throw new BadRequestException('Password reset token has expired');
        }

        const isSamePassword = await bcrypt.compare(password, user.password);
        if (isSamePassword) {
            throw new BadRequestException('New password must be different from the current password');
        }

        user.password = await bcrypt.hash(password, 10);
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;
        await this.userRepo.save(user);

        try {
            const confirmationHtml = generatePasswordChangedEmailTemplate(user.name);
            await this.emailService.sendEmail(
                user.email,
                'Password Successfully Changed - GoQuestly',
                confirmationHtml
            );
        } catch (error) {
            this.logger.error(`Failed to send password change confirmation to ${user.email}`, error);
        }

        this.logger.log(`Password successfully reset for user ${user.email}`);

        return {
            success: true,
            message: 'Password successfully changed'
        };
    }

    async verifyResetToken(token: string) {
        let payload: { type: string; userId: any; };

        try {
            payload = this.jwtService.verify(token, {
                secret: process.env.JWT_RESET_SECRET || process.env.JWT_SECRET
            });
        } catch (error) {
            throw new BadRequestException('Invalid or expired token');
        }

        if (payload.type !== this.PASSWORD_RESET_TOKEN_TYPE) {
            throw new BadRequestException('Invalid token type');
        }

        const user = await this.userRepo.findOne({
            where: {userId: payload.userId}
        });

        if (!user || user.resetPasswordToken !== token) {
            throw new BadRequestException('Invalid token');
        }

        if (!user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
            throw new BadRequestException('Token has expired');
        }

        return {
            valid: true,
            email: user.email
        };
    }
}