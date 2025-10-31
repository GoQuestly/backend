import { Controller, Get, Post, Patch, Delete, Param, Body, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import { GetUser } from '@/auth/decorators/get-user.decorator';
import { QuestPointService } from './quest-point.service';
import { CreateQuestPointDto } from './dto/create-quest-point.dto';
import { UpdateQuestPointDto } from './dto/update-quest-point.dto';
import { QuestPointResponseDto } from './dto/quest-point-response.dto';

@ApiTags('Organizer - Quest Points')
@ApiBearerAuth()
@Controller('organizer/quest')
@UseGuards(JwtAuthGuard)
export class QuestPointController {
    constructor(private readonly questPointService: QuestPointService) {}

    @Get(':questId/points')
    async findAll(
        @Param('questId', ParseIntPipe) questId: number,
        @GetUser('userId') userId: number,
    ): Promise<QuestPointResponseDto[]> {
        return this.questPointService.findAll(questId, userId);
    }

    @Post(':questId/points')
    async create(
        @Param('questId', ParseIntPipe) questId: number,
        @Body() dto: CreateQuestPointDto,
        @GetUser('userId') userId: number,
    ): Promise<QuestPointResponseDto> {
        return this.questPointService.create(questId, dto, userId);
    }

    @Patch('points/:pointId')
    async update(
        @Param('pointId', ParseIntPipe) pointId: number,
        @Body() dto: UpdateQuestPointDto,
        @GetUser('userId') userId: number,
    ): Promise<QuestPointResponseDto> {
        return this.questPointService.update(pointId, dto, userId);
    }

    @Delete('points/:pointId')
    async remove(
        @Param('pointId', ParseIntPipe) pointId: number,
        @GetUser('userId') userId: number,
    ): Promise<void> {
        return this.questPointService.remove(pointId, userId);
    }
}