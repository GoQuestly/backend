import {
    Controller,
    Get,
    Post,
    Put,
    Body,
    Param,
    Query,
    ParseIntPipe,
    UseGuards,
    ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiExtraModels } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import { GetUser } from '@/auth/decorators/get-user.decorator';
import { QuestSessionService } from './quest-session.service';
import {
    QuestSessionDto,
    QuestSessionResponseDto,
    GetQuestSessionsQueryDto,
    PaginatedQuestSessionsResponseDto,
} from './dto/quest-session.dto';

@ApiTags('Organizer - Quest Sessions')
@ApiBearerAuth()
@ApiExtraModels(GetQuestSessionsQueryDto)
@Controller('organizer')
@UseGuards(JwtAuthGuard)
export class OrganizerSessionController {
    constructor(private readonly sessionService: QuestSessionService) {}

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
        return this.sessionService.findById(id, userId);
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
}