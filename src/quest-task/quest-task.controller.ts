import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import { GetUser } from '@/auth/decorators/get-user.decorator';
import { QuestTaskService } from './quest-task.service';
import {
    CreateQuizTaskDto,
    UpdateQuizTaskDto,
    CreateCodeWordTaskDto,
    UpdateCodeWordTaskDto,
    CreatePhotoTaskDto,
    UpdatePhotoTaskDto,
    QuestTaskResponseDto
} from './dto';

@ApiTags('Organizer - Quest Tasks')
@ApiBearerAuth()
@Controller('organizer/quest-tasks')
@UseGuards(JwtAuthGuard)
export class QuestTaskController {
    constructor(private readonly questTaskService: QuestTaskService) {}

    @Post('quiz/:questPointId')
    @ApiParam({ name: 'questPointId', type: 'number' })
    async createQuizTask(
        @Param('questPointId', ParseIntPipe) questPointId: number,
        @Body() dto: CreateQuizTaskDto,
        @GetUser('userId') userId: number,
    ): Promise<QuestTaskResponseDto> {
        return this.questTaskService.createQuizTask(dto, questPointId, userId);
    }

    @Post('code-word/:questPointId')
    @ApiParam({ name: 'questPointId', type: 'number' })
    async createCodeWordTask(
        @Param('questPointId', ParseIntPipe) questPointId: number,
        @Body() dto: CreateCodeWordTaskDto,
        @GetUser('userId') userId: number,
    ): Promise<QuestTaskResponseDto> {
        return this.questTaskService.createCodeWordTask(dto, questPointId, userId);
    }

    @Post('photo/:questPointId')
    @ApiParam({ name: 'questPointId', type: 'number' })
    async createPhotoTask(
        @Param('questPointId', ParseIntPipe) questPointId: number,
        @Body() dto: CreatePhotoTaskDto,
        @GetUser('userId') userId: number,
    ): Promise<QuestTaskResponseDto> {
        return this.questTaskService.createPhotoTask(dto, questPointId, userId);
    }

    @Get(':id')
    @ApiParam({ name: 'id', type: 'number' })
    async findById(
        @Param('id', ParseIntPipe) id: number,
        @GetUser('userId') userId: number,
    ): Promise<QuestTaskResponseDto> {
        return this.questTaskService.findById(id, userId);
    }

    @Put('quiz/:id')
    @ApiParam({ name: 'id', type: 'number' })
    async updateQuizTask(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateQuizTaskDto,
        @GetUser('userId') userId: number,
    ): Promise<QuestTaskResponseDto> {
        return this.questTaskService.updateQuizTask(id, dto, userId);
    }

    @Put('code-word/:id')
    @ApiParam({ name: 'id', type: 'number' })
    async updateCodeWordTask(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateCodeWordTaskDto,
        @GetUser('userId') userId: number,
    ): Promise<QuestTaskResponseDto> {
        return this.questTaskService.updateCodeWordTask(id, dto, userId);
    }

    @Put('photo/:id')
    @ApiParam({ name: 'id', type: 'number' })
    async updatePhotoTask(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdatePhotoTaskDto,
        @GetUser('userId') userId: number,
    ): Promise<QuestTaskResponseDto> {
        return this.questTaskService.updatePhotoTask(id, dto, userId);
    }

    @Delete(':id')
    @ApiParam({ name: 'id', type: 'number' })
    async delete(
        @Param('id', ParseIntPipe) id: number,
        @GetUser('userId') userId: number,
    ): Promise<void> {
        return this.questTaskService.delete(id, userId);
    }
}