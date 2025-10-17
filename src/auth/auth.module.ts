import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserEntity } from '@/common/entities/UserEntity';
import { JwtStrategy } from './jwt.strategy';
import { GoogleAuthService } from "@/auth/google.service";
import {EmailModule} from "@/email/email.module";
import {JWT_TOKEN_EXPIRATION_TIME} from "@/auth/auth.constants";

@Module({
    imports: [
        TypeOrmModule.forFeature([UserEntity]),
        PassportModule,
        EmailModule,
        JwtModule.register({
            secret: process.env.JWT_SECRET,
            signOptions: { expiresIn: JWT_TOKEN_EXPIRATION_TIME },
        }),
    ],
    controllers: [AuthController],
    providers: [
        AuthService,
        JwtStrategy,
        GoogleAuthService
    ],
    exports: [AuthService],
})
export class AuthModule {}