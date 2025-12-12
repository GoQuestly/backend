import {Module} from '@nestjs/common';
import {JwtModule} from '@nestjs/jwt';
import {PassportModule} from '@nestjs/passport';
import {TypeOrmModule} from '@nestjs/typeorm';
import {AdminController} from './admin.controller';
import {AdminService} from './admin.service';
import {AdminEntity} from '@/common/entities/admin.entity';
import {UserEntity} from '@/common/entities/user.entity';
import {AdminJwtStrategy} from './admin-jwt.strategy';
import {JWT_TOKEN_EXPIRATION_TIME} from '@/auth/auth.constants';

@Module({
    imports: [
        TypeOrmModule.forFeature([AdminEntity, UserEntity]),
        PassportModule,
        JwtModule.register({
            secret: process.env.JWT_SECRET,
            signOptions: {expiresIn: JWT_TOKEN_EXPIRATION_TIME},
        }),
    ],
    controllers: [AdminController],
    providers: [
        AdminService,
        AdminJwtStrategy,
    ],
    exports: [AdminService],
})
export class AdminModule {
}
