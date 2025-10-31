import {
    Controller,
    Get,
    Post,
    Delete,
    Body,
    Param,
    Query,
    ParseIntPipe,
    HttpCode,
    HttpStatus,
    UseGuards,
    ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiExtraModels } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import { GetUser } from '@/auth/decorators/get-user.decorator';
import { QuestSessionService } from './quest-session.service';
import {
    JoinSessionDto,
    QuestSessionResponseDto,
    GetMySessionsQueryDto,
    PaginatedMySessionsResponseDto,
} from './dto/quest-session.dto';

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

    @Delete(':id/leave')
    @HttpCode(HttpStatus.NO_CONTENT)
    async leaveSession(
        @Param('id', ParseIntPipe) id: number,
        @GetUser('userId') userId: number,
    ): Promise<void> {
        await this.sessionService.leaveSession(id, userId);
    }
}