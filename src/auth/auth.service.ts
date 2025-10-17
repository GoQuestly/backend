import {BadRequestException, Injectable, Logger, NotFoundException, UnauthorizedException} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {Repository} from 'typeorm';
import * as bcrypt from 'bcrypt';
import {UserEntity} from '@/common/entities/UserEntity';
import {RegisterDto} from './dto/RegisterDto';
import {JwtService} from '@nestjs/jwt';
import {LoginDto} from "@/auth/dto/LoginDto";
import {RequestPasswordResetDto, ResetPasswordDto} from './dto/reset-password.dto';
import {EmailService} from '@/email/email.service';
import {generatePasswordResetEmailTemplate} from '@/email/templates/password-reset.template';
import {generatePasswordChangedEmailTemplate} from '@/email/templates/password-changed.template';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);
    private readonly RATE_LIMIT_MINUTES:number = 10;
    private readonly TOKEN_EXPIRATION_MINUTES: number = 60;
    private readonly PASSWORD_RESET_TOKEN_TYPE: string = 'password-reset';

    constructor(
        @InjectRepository(UserEntity)
        private readonly userRepo: Repository<UserEntity>,
        private readonly jwtService: JwtService,
        private readonly emailService: EmailService,
    ) {
    }

    async register(dto: RegisterDto) {
        const existing = await this.userRepo.findOne({where: {email: dto.email}});
        if (existing) throw new BadRequestException('Email already registered');

        const hashedPassword = await bcrypt.hash(dto.password, 10);
        const user = this.userRepo.create({
            name: dto.name,
            email: dto.email,
            password: hashedPassword,
        });
        const savedUser = await this.userRepo.save(user);

        const payload = {sub: savedUser.userId, email: savedUser.email};
        const token = this.jwtService.sign(payload);

        const {password, ...userData} = savedUser;

        return {
            access_token: token,
            user: userData,
        };
    }

    async login(dto: LoginDto) {
        const user = await this.userRepo.findOne({where: {email: dto.email}});
        if (!user) throw new UnauthorizedException('Invalid email or password');

        const isMatch = await bcrypt.compare(dto.password, user.password);
        if (!isMatch) throw new UnauthorizedException('Invalid email or password');

        const payload = {sub: user.userId, email: user.email};
        const accessToken = this.jwtService.sign(payload);

        const {password, ...userData} = user;
        return {
            access_token: accessToken,
            user: userData,
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
                expiresIn: `${this.TOKEN_EXPIRATION_MINUTES}m`,
                secret: process.env.JWT_RESET_SECRET,
            }
        );

        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = new Date(Date.now() + this.TOKEN_EXPIRATION_MINUTES * 60 * 1000);
        user.resetPasswordLastRequest = new Date();
        await this.userRepo.save(user);

        const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
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