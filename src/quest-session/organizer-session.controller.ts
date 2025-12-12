import {Body, Controller, Get, Param, ParseIntPipe, Post, Put, Query, UseGuards, ValidationPipe,} from '@nestjs/common';
import {ApiBearerAuth, ApiExtraModels, ApiTags} from '@nestjs/swagger';
import {JwtAuthGuard} from '@/auth/jwt-auth.guard';
import {GetUser} from '@/auth/decorators/get-user.decorator';
import {QuestSessionService} from './quest-session.service';
import {LocationService} from './location.service';
import {QuestSessionDto} from './dto/quest-session.dto';
import {GetQuestSessionsQueryDto} from "@/quest-session/dto/get-quest-sessions-query.dto";
import {QuestSessionResponseDto} from "@/quest-session/dto/quest-session-response.dto";
import {PaginatedQuestSessionsResponseDto} from "@/quest-session/dto/paginated-quest-sessions-response.dto";
import {ParticipantLocationDto} from "@/quest-session/dto/participant-location.dto";
import {ParticipantScoresResponseDto} from "@/quest-session/dto/participant-scores-response.dto";
import {ParticipantTaskService} from './participant-task.service';
import {PendingPhotoDto, PhotoModerationActionDto, PhotoModerationResponseDto} from './dto/photo-moderation.dto';
import {OrganizerSessionResultsResponseDto} from "@/quest-session/dto/organizer-session-results-response.dto";

@ApiTags('Organizer - Quest Sessions')
@ApiBearerAuth()
@ApiExtraModels(GetQuestSessionsQueryDto)
@Controller('organizer')
@UseGuards(JwtAuthGuard)
export class OrganizerSessionController {
    constructor(
        private readonly sessionService: QuestSessionService,
        private readonly locationService: LocationService,
        private readonly participantTaskService: ParticipantTaskService,
    ) {}

    @Post('quest/:questId/sessions')
    async create(
        @Param('questId', ParseIntPipe) questId: number,
        @Body() dto: QuestSessionDto,
        @GetUser('userId') userId: number,
    ): Promise<QuestSessionResponseDto> {
        return this.sessionService.create(questId, dto, userId);
    }

    @Get('quest/:questId/sessions')
    async findByQuestId(
        @Param('questId', ParseIntPipe) questId: number,
        @GetUser('userId') userId: number,
        @Query(new ValidationPipe({ transform: true, whitelist: true })) query: GetQuestSessionsQueryDto,
    ): Promise<PaginatedQuestSessionsResponseDto> {
        const { pageNumber = 1, pageSize = 10 } = query;
        const maxPageSize = 100;
        const finalPageSize = Math.min(pageSize, maxPageSize);

        return this.sessionService.findByQuestId(questId, userId, pageNumber, finalPageSize);
    }

    @Get('sessions/:id')
    async findById(
        @Param('id', ParseIntPipe) id: number,
        @GetUser('userId') userId: number,
    ): Promise<QuestSessionResponseDto> {
        return this.sessionService.findById(id, userId, true);
    }

    @Put('sessions/:id')
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: QuestSessionDto,
        @GetUser('userId') userId: number,
    ): Promise<QuestSessionResponseDto> {
        return this.sessionService.update(id, dto, userId);
    }

    @Post('sessions/:id/cancel')
    async cancelSession(
        @Param('id', ParseIntPipe) id: number,
        @GetUser('userId') userId: number,
    ): Promise<QuestSessionResponseDto> {
        return this.sessionService.cancelSession(id, userId);
    }

    @Get('sessions/:id/scores')
    async getParticipantScores(
        @Param('id', ParseIntPipe) id: number,
        @GetUser('userId') userId: number,
    ): Promise<ParticipantScoresResponseDto> {
        return this.sessionService.getParticipantScores(id, userId, true, false);
    }

    @Get('sessions/:id/locations/latest')
    async getLatestLocations(
        @Param('id', ParseIntPipe) id: number,
        @GetUser('userId') userId: number,
    ): Promise<ParticipantLocationDto[]> {
        return this.locationService.getLatestLocations(id, userId);
    }

    @Get('sessions/:id/photos/pending')
    async getPendingPhotos(
        @Param('id', ParseIntPipe) id: number,
        @GetUser('userId') userId: number,
    ): Promise<PendingPhotoDto[]> {
        return this.participantTaskService.getPendingPhotos(id, userId);
    }

    @Post('sessions/:sessionId/photos/:photoId/moderate')
    async moderatePhoto(
        @Param('sessionId', ParseIntPipe) sessionId: number,
        @Param('photoId', ParseIntPipe) photoId: number,
        @Body() dto: PhotoModerationActionDto,
        @GetUser('userId') userId: number,
    ): Promise<PhotoModerationResponseDto> {
        return this.participantTaskService.moderatePhoto(sessionId, photoId, userId, dto);
    }

    @Get('sessions/:id/results')
    async getSessionResults(
        @Param('id', ParseIntPipe) id: number,
        @GetUser('userId') userId: number,
    ): Promise<OrganizerSessionResultsResponseDto> {
        return this.sessionService.getSessionResults(id, userId, true) as Promise<OrganizerSessionResultsResponseDto>;
    }
}