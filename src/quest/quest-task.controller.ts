import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, ParseIntPipe } from '@nestjs/common';
import { QuestTaskService } from './quest-task.service';
import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import {
    CreateQuizTaskDto,
    UpdateQuizTaskDto,
    CreateCodeWordTaskDto,
    UpdateCodeWordTaskDto,
    CreatePhotoTaskDto,
    UpdatePhotoTaskDto,
    QuestTaskResponseDto
} from './dto';
import { ApiBearerAuth, ApiTags, ApiParam } from '@nestjs/swagger';

@ApiTags('Quest Tasks')
@ApiBearerAuth()
@Controller('organizer/quest-tasks')
@UseGuards(JwtAuthGuard)
export class QuestTaskController {
    constructor(private readonly questTaskService: QuestTaskService) {}

    @Post('quiz/:questPointId')
    @ApiParam({ name: 'questPointId', type: 'number' })
    async createQuizTask(
        @Param('questPointId', ParseIntPipe) questPointId: number,
        @Body() dto: CreateQuizTaskDto
    ): Promise<QuestTaskResponseDto> {
        return this.questTaskService.createQuizTask(dto, questPointId);
    }

    @Post('code-word/:questPointId')
    @ApiParam({ name: 'questPointId', type: 'number' })
    async createCodeWordTask(
        @Param('questPointId', ParseIntPipe) questPointId: number,
        @Body() dto: CreateCodeWordTaskDto
    ): Promise<QuestTaskResponseDto> {
        return this.questTaskService.createCodeWordTask(dto, questPointId);
    }

    @Post('photo/:questPointId')
    @ApiParam({ name: 'questPointId', type: 'number' })
    async createPhotoTask(
        @Param('questPointId', ParseIntPipe) questPointId: number,
        @Body() dto: CreatePhotoTaskDto
    ): Promise<QuestTaskResponseDto> {
        return this.questTaskService.createPhotoTask(dto, questPointId);
    }

    @Get()
    async findAll(): Promise<QuestTaskResponseDto[]> {
        return this.questTaskService.findAll();
    }

    @Put('quiz/:id')
    @ApiParam({ name: 'id', type: 'number' })
    async updateQuizTask(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateQuizTaskDto
    ): Promise<QuestTaskResponseDto> {
        return this.questTaskService.updateQuizTask(id, dto);
    }

    @Put('code-word/:id')
    @ApiParam({ name: 'id', type: 'number' })
    async updateCodeWordTask(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateCodeWordTaskDto
    ): Promise<QuestTaskResponseDto> {
        return this.questTaskService.updateCodeWordTask(id, dto);
    }

    @Put('photo/:id')
    @ApiParam({ name: 'id', type: 'number' })
    async updatePhotoTask(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdatePhotoTaskDto
    ): Promise<QuestTaskResponseDto> {
        return this.questTaskService.updatePhotoTask(id, dto);
    }

    @Delete(':id')
    @ApiParam({ name: 'id', type: 'number' })
    async delete(@Param('id', ParseIntPipe) id: number): Promise<void> {
        return this.questTaskService.delete(id);
    }
}