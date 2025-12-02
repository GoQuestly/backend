import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseIntPipe,
    Post,
    Query,
    UseGuards,
    ValidationPipe,
} from '@nestjs/common';
import {ApiBearerAuth, ApiExtraModels, ApiTags} from '@nestjs/swagger';
import {JwtAuthGuard} from '@/auth/jwt-auth.guard';
import {GetUser} from '@/auth/decorators/get-user.decorator';
import {QuestSessionService} from './quest-session.service';
import {JoinSessionDto} from "@/quest-session/dto/join-session.dto";
import {GetMySessionsQueryDto} from "@/quest-session/dto/get-my-sessions-query.dto";
import {QuestSessionResponseDto} from "@/quest-session/dto/quest-session-response.dto";
import {PaginatedMySessionsResponseDto} from "@/quest-session/dto/paginated-my-sessions-response.dto";
import {SessionPointResponseDto} from "@/quest-session/dto/session-point-response.dto";
import {ParticipantScoresResponseDto} from "@/quest-session/dto/participant-scores-response.dto";

@ApiTags('Participant - Quest Sessions')
@ApiBearerAuth()
@ApiExtraModels(GetMySessionsQueryDto)
@Controller('participant/sessions')
@UseGuards(JwtAuthGuard)
export class ParticipantSessionController {
    constructor(private readonly sessionService: QuestSessionService) {}

    @Post('join')
    async joinSession(
        @Body() dto: JoinSessionDto,
        @GetUser('userId') userId: number,
    ): Promise<QuestSessionResponseDto> {
        return this.sessionService.joinSession(dto, userId);
    }

    @Get('my')
    async findMySessions(
        @GetUser('userId') userId: number,
        @Query(new ValidationPipe({ transform: true, whitelist: true })) query: GetMySessionsQueryDto,
    ): Promise<PaginatedMySessionsResponseDto> {
        const { limit = 10, offset = 0 } = query;
        const maxLimit = 100;
        const finalLimit = Math.min(limit, maxLimit);

        return this.sessionService.findUserSessions(userId, finalLimit, offset);
    }

    @Get(':id')
    async findById(
        @Param('id', ParseIntPipe) id: number,
        @GetUser('userId') userId: number,
    ): Promise<QuestSessionResponseDto> {
        return this.sessionService.findById(id, userId);
    }

    @Get(':id/points')
    async getPoints(
        @Param('id', ParseIntPipe) id: number,
        @GetUser('userId') userId: number,
    ): Promise<SessionPointResponseDto[]> {
        return this.sessionService.getSessionPoints(id, userId);
    }

    @Get(':id/scores')
    async getParticipantScores(
        @Param('id', ParseIntPipe) id: number,
        @GetUser('userId') userId: number,
    ): Promise<ParticipantScoresResponseDto> {
        return this.sessionService.getParticipantScores(id, userId, false, true);
    }

    @Delete(':id/leave')
    @HttpCode(HttpStatus.NO_CONTENT)
    async leaveSession(
        @Param('id', ParseIntPipe) id: number,
        @GetUser('userId') userId: number,
    ): Promise<void> {
        await this.sessionService.leaveSession(id, userId);
    }
}