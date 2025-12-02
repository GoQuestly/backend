import {
    BadRequestException,
    Body,
    Controller,
    Get,
    Param,
    ParseIntPipe,
    Post,
    UploadedFile,
    UseGuards
} from '@nestjs/common';
import {ApiBearerAuth, ApiTags} from '@nestjs/swagger';
import {JwtAuthGuard} from '@/auth/jwt-auth.guard';
import {GetUser} from '@/auth/decorators/get-user.decorator';
import {ParticipantTaskService} from './participant-task.service';
import {ParticipantTaskResponseDto} from './dto/participant-task-response.dto';
import {StartTaskResponseDto} from './dto/start-task.dto';
import {
    SubmitQuizAnswerDto
} from './dto/submit-task.dto';
import {FileUpload} from '@/common/decorators/file-upload.decorator';
import {TASK_PHOTO_UPLOAD_CONFIG} from '@/common/constants/file-upload.constants';
// @ts-ignore
import type {File} from 'multer';
import {TaskCompletionResponseDto} from "@/quest-session/dto/task-completion-response.dto";
import {SubmitCodeWordTaskDto} from "@/quest-session/dto/submit-code-word-task.dto";
import {QuizAnswerResponseDto} from "@/quest-session/dto/quiz-answer-response.dto";

@ApiTags('Participant - Tasks')
@ApiBearerAuth()
@Controller('participant/sessions')
@UseGuards(JwtAuthGuard)
export class ParticipantTaskController {
    constructor(private readonly participantTaskService: ParticipantTaskService) {
    }

    @Get(':sessionId/points/:pointId/task')
    async getTaskForPoint(
        @Param('sessionId', ParseIntPipe) sessionId: number,
        @Param('pointId', ParseIntPipe) pointId: number,
        @GetUser('userId') userId: number,
    ): Promise<ParticipantTaskResponseDto> {
        return this.participantTaskService.getTaskForPoint(sessionId, pointId, userId);
    }

    @Post(':sessionId/points/:pointId/task/start')
    async startTask(
        @Param('sessionId', ParseIntPipe) sessionId: number,
        @Param('pointId', ParseIntPipe) pointId: number,
        @GetUser('userId') userId: number,
    ): Promise<StartTaskResponseDto> {
        return this.participantTaskService.startTask(sessionId, pointId, userId);
    }

    @Get(':sessionId/active-task')
    async getActiveTask(
        @Param('sessionId', ParseIntPipe) sessionId: number,
        @GetUser('userId') userId: number,
    ): Promise<StartTaskResponseDto | null> {
        return this.participantTaskService.getActiveTask(sessionId, userId);
    }

    @Post(':sessionId/points/:pointId/task/submit/quiz/answer')
    async submitQuizAnswer(
        @Param('sessionId', ParseIntPipe) sessionId: number,
        @Param('pointId', ParseIntPipe) pointId: number,
        @Body() dto: SubmitQuizAnswerDto,
        @GetUser('userId') userId: number,
    ): Promise<QuizAnswerResponseDto | TaskCompletionResponseDto> {
        return this.participantTaskService.submitQuizAnswer(sessionId, pointId, userId, dto);
    }

    @Post(':sessionId/points/:pointId/task/submit/code-word')
    async submitCodeWordTask(
        @Param('sessionId', ParseIntPipe) sessionId: number,
        @Param('pointId', ParseIntPipe) pointId: number,
        @Body() dto: SubmitCodeWordTaskDto,
        @GetUser('userId') userId: number,
    ): Promise<TaskCompletionResponseDto> {
        return this.participantTaskService.submitCodeWordTask(sessionId, pointId, userId, dto);
    }

    @Post(':sessionId/points/:pointId/task/submit/photo')
    @FileUpload(TASK_PHOTO_UPLOAD_CONFIG, 'Task photo (JPG, PNG only, max 5MB)')
    async submitPhotoTask(
        @Param('sessionId', ParseIntPipe) sessionId: number,
        @Param('pointId', ParseIntPipe) pointId: number,
        @UploadedFile() file: File,
        @GetUser('userId') userId: number,
    ): Promise<TaskCompletionResponseDto> {
        if (!file) {
            throw new BadRequestException('Photo file is required');
        }
        const photoUrl = `/uploads/task-photos/${file.filename}`;
        return this.participantTaskService.submitPhotoTask(sessionId, pointId, userId, photoUrl);
    }
}