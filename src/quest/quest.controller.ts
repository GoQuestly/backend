import {
    Controller,
    Post,
    Get,
    Patch,
    Delete,
    Body,
    Param,
    ParseIntPipe,
    UseGuards,
    UploadedFile,
    BadRequestException,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import {ApiTags, ApiBearerAuth} from '@nestjs/swagger';
import {QuestService} from './quest.service';
import {CreateQuestDto} from './dto/create-quest.dto';
import {UpdateQuestDto} from './dto/update-quest.dto';
import {QuestResponseDto} from './dto/quest-response.dto';
import {JwtAuthGuard} from '@/auth/jwt-auth.guard';
import {GetUser} from '@/auth/decorators/get-user.decorator';
import {FileUpload} from '@/common/decorators/file-upload.decorator';
import {QUEST_COVER_UPLOAD_CONFIG} from '@/common/constants/file-upload.constants';
// @ts-ignore
import type {File} from 'multer';

@ApiTags('Quest')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard)
export class QuestController {
    constructor(private readonly questService: QuestService) {
    }

    @Post('quest')
    async createQuest(
        @GetUser('userId') userId: number,
        @Body() createQuestDto: CreateQuestDto,
    ): Promise<QuestResponseDto> {
        return this.questService.createQuest(userId, createQuestDto);
    }

    @Get('quests')
    async getUserQuests(@GetUser('userId') userId: number): Promise<QuestResponseDto[]> {
        return this.questService.getUserQuests(userId);
    }

    @Get('quest/:questId')
    async getQuest(
        @Param('questId', ParseIntPipe) questId: number,
    ): Promise<QuestResponseDto> {
        return this.questService.getQuest(questId);
    }

    @Patch('quest/:questId')
    async updateQuest(
        @Param('questId', ParseIntPipe) questId: number,
        @GetUser('userId') userId: number,
        @Body() updateQuestDto: UpdateQuestDto,
    ): Promise<QuestResponseDto> {
        return this.questService.updateQuest(questId, userId, updateQuestDto);
    }

    @Delete('quest/:questId')
    @HttpCode(HttpStatus.NO_CONTENT)
    async deleteQuest(
        @Param('questId', ParseIntPipe) questId: number,
        @GetUser('userId') userId: number,
    ): Promise<void> {
        return this.questService.deleteQuest(questId, userId);
    }

    @Post('quest/:questId/cover-image')
    @FileUpload(QUEST_COVER_UPLOAD_CONFIG, 'Quest cover image (PNG, JPG, GIF up to 10MB)')
    async uploadCoverImage(
        @Param('questId', ParseIntPipe) questId: number,
        @GetUser('userId') userId: number,
        @UploadedFile() file: File,
    ): Promise<QuestResponseDto> {
        if (!file) {
            throw new BadRequestException('File is required');
        }

        return this.questService.uploadCoverImage(questId, userId, file.filename);
    }
}