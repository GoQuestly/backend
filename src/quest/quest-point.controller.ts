import {Controller, Get, Post, Patch, Delete, Param, Body, ParseIntPipe, UseGuards} from '@nestjs/common';
import {QuestPointService} from './quest-point.service';
import {CreateQuestPointDto} from './dto/create-quest-point.dto';
import {UpdateQuestPointDto} from './dto/update-quest-point.dto';
import {JwtAuthGuard} from "@/auth/jwt-auth.guard";
import {ApiBearerAuth} from "@nestjs/swagger";

@ApiBearerAuth()
@Controller('organizer/quest')
@UseGuards(JwtAuthGuard)
export class QuestPointController {
    constructor(private readonly questPointService: QuestPointService) {
    }

    @Get(':questId/points')
    async findAll(
        @Param('questId', ParseIntPipe) questId: number,
    ) {
        return this.questPointService.findAll(questId);
    }

    @Post(':questId/points')
    async create(
        @Param('questId', ParseIntPipe) questId: number,
        @Body() dto: CreateQuestPointDto
    ) {
        return this.questPointService.create(questId, dto);
    }

    @Patch('points/:pointId')
    async update(
        @Param('pointId', ParseIntPipe) pointId: number,
        @Body() dto: UpdateQuestPointDto,
    ) {
        return this.questPointService.update(pointId, dto);
    }

    @Delete('points/:pointId')
    async remove(@Param('pointId', ParseIntPipe) pointId: number) {
        return this.questPointService.remove(pointId);
    }
}