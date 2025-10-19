import {
    Controller,
    Get,
    Patch,
    Body,
    Post,
    UseGuards,
    UseInterceptors,
    UploadedFile,
    BadRequestException,
} from '@nestjs/common';
import {
    ApiTags,
    ApiBearerAuth,
    ApiConsumes,
    ApiBody,
} from '@nestjs/swagger';
import {FileInterceptor} from '@nestjs/platform-express';
import {diskStorage} from 'multer';
import {extname} from 'path';
import {ProfileService} from './profile.service';
import {UpdateProfileDto} from './dto/update-profile.dto';
import {JwtAuthGuard} from '@/auth/jwt-auth.guard';
import {GetUser} from '@/auth/decorators/get-user.decorator';
// @ts-ignore
import type {File} from 'multer';
import {UserDto} from "@/common/dto/user.dto";
import {ALLOWED_FILE_TYPES_REGEX, MAX_FILE_SIZE_BYTES} from "@/common/constants";

@ApiTags('Profile')
@ApiBearerAuth()
@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
    constructor(private readonly profileService: ProfileService) {
    }

    @Get()
    async getProfile(@GetUser('userId') userId: number): Promise<UserDto> {
        return this.profileService.getProfile(userId);
    }

    @Patch()
    async updateProfile(
        @GetUser('userId') userId: number,
        @Body() updateProfileDto: UpdateProfileDto,
    ): Promise<UserDto> {
        return this.profileService.updateProfile(userId, updateProfileDto);
    }

    @Post('avatar')
    @UseInterceptors(
        FileInterceptor('file', {
            storage: diskStorage({
                destination: './uploads/avatars',
                filename: (req, file, callback) => {
                    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                    callback(null, uniqueSuffix + extname(file.originalname));
                },
            }),
            limits: {fileSize: MAX_FILE_SIZE_BYTES},
            fileFilter: (req, file, callback) => {
                if (!file.mimetype.match(ALLOWED_FILE_TYPES_REGEX)) {
                    return callback(new Error('Only image files are allowed!'), false);
                }
                callback(null, true);
            },
        }),
    )
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                    description: 'Avatar image (JPG, PNG, WEBP only, max 5MB)',
                },
            },
            required: ['file'],
        },
    })
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