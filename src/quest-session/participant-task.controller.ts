import {Controller, Get, Param, ParseIntPipe, UseGuards} from '@nestjs/common';
import {ApiBearerAuth, ApiTags} from '@nestjs/swagger';
import {JwtAuthGuard} from '@/auth/jwt-auth.guard';
import {GetUser} from '@/auth/decorators/get-user.decorator';
import {ParticipantTaskService} from './participant-task.service';
import {ParticipantTaskResponseDto} from './dto/participant-task-response.dto';

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
}