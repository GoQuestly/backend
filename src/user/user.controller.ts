import {
    Controller,
    Get,
    Patch,
    Body,
    Post,
    UseGuards,
    UploadedFile,
    BadRequestException,
} from '@nestjs/common';
import {ApiTags, ApiBearerAuth} from '@nestjs/swagger';
import {UserService} from './user.service';
import {UpdateProfileDto} from './dto/update-profile.dto';
import {JwtAuthGuard} from '@/auth/jwt-auth.guard';
import {GetUser} from '@/auth/decorators/get-user.decorator';
import {UserDto} from '@/common/dto/user.dto';
import {FileUpload} from '@/common/decorators/file-upload.decorator';
import {AVATAR_UPLOAD_CONFIG} from '@/common/constants/file-upload.constants';
// @ts-ignore
import type {File} from 'multer';

@ApiTags('Profile')
@ApiBearerAuth()
@Controller('user')
@UseGuards(JwtAuthGuard)
export class UserController {
    constructor(private readonly profileService: UserService) {
    }

    @Get('profile')
    async getProfile(@GetUser('userId') userId: number): Promise<UserDto> {
        return this.profileService.getProfile(userId);
    }

    @Patch('profile')
    async updateProfile(
        @GetUser('userId') userId: number,
        @Body() updateProfileDto: UpdateProfileDto,
    ): Promise<UserDto> {
        return this.profileService.updateProfile(userId, updateProfileDto);
    }

    @Post('profile/avatar')
    @FileUpload(AVATAR_UPLOAD_CONFIG, 'Avatar image (JPG, PNG, WEBP only, max 5MB)')
    async uploadAvatar(
        @UploadedFile() file: File,
        @GetUser('userId') userId: number,
    ) {
        if (!file) {
            throw new BadRequestException('File is required');
        }

        return this.profileService.updateUserAvatar(userId, file.filename);
    }
}