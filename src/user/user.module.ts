import {Module} from '@nestjs/common';
import {TypeOrmModule} from '@nestjs/typeorm';
import {JwtModule} from '@nestjs/jwt';
import {MulterModule} from '@nestjs/platform-express';
import {UserController} from './user.controller';
import {UserService} from './user.service';
import {UserEntity} from '@/common/entities/user.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([UserEntity]),
        JwtModule,
        MulterModule.register({
            dest: './uploads/avatars',
        }),
    ],
    controllers: [UserController],
    providers: [UserService],
    exports: [UserService],
})
export class UserModule {
}