import {Module} from '@nestjs/common';
import {TypeOrmModule} from '@nestjs/typeorm';
import {JwtModule} from '@nestjs/jwt';
import {MulterModule} from '@nestjs/platform-express';
import {ProfileController} from './profile.controller';
import {ProfileService} from './profile.service';
import {UserEntity} from '@/common/entities/UserEntity';

@Module({
    imports: [
        TypeOrmModule.forFeature([UserEntity]),
        JwtModule,
        MulterModule.register({
            dest: './uploads/avatars',
        }),
    ],
    controllers: [ProfileController],
    providers: [ProfileService],
    exports: [ProfileService],
})
export class ProfileModule {
}