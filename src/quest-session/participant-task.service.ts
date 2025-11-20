import {BadRequestException, ForbiddenException, Injectable, NotFoundException} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {Repository} from 'typeorm';
import {QuestSessionEntity} from '@/common/entities/QuestSessionEntity';
import {QuestPointEntity} from '@/common/entities/QuestPointEntity';
import {QuestTaskEntity} from '@/common/entities/QuestTaskEntity';
import {ParticipantTaskEntity} from '@/common/entities/ParticipantTaskEntity';
import {QuestTaskType} from '@/common/enums/QuestTaskType';
import {
    ParticipantCodeWordTaskResponseDto,
    ParticipantPhotoTaskResponseDto,
    ParticipantQuizTaskResponseDto,
    ParticipantTaskResponseDto,
} from './dto/participant-task-response.dto';

import {isSessionActive} from '@/common/utils/session.util';

@Injectable()
export class ParticipantTaskService {
    constructor(
        @InjectRepository(QuestSessionEntity)
        private sessionRepository: Repository<QuestSessionEntity>,
        @InjectRepository(QuestPointEntity)
        private questPointRepository: Repository<QuestPointEntity>,
        @InjectRepository(ParticipantTaskEntity)
        private participantTaskRepository: Repository<ParticipantTaskEntity>,
    ) {
    }


    async getTaskForPoint(sessionId: number, pointId: number, userId: number): Promise<ParticipantTaskResponseDto> {
        const session = await this.sessionRepository.findOne({
            where: {questSessionId: sessionId},
            relations: ['quest', 'quest.points', 'participants', 'participants.user', 'participants.points', 'participants.points.point'],
        });

        if (!session) {
            throw new NotFoundException(`Session with ID ${sessionId} not found`);
        }

        if (!isSessionActive(session)) {
            throw new BadRequestException('Session is not active');
        }

        const participant = session.participants.find(p => p.user.userId === userId);

        if (!participant) {
            throw new ForbiddenException('You are not a participant in this session');
        }

        const point = await this.questPointRepository.findOne({
            where: {questPointId: pointId, quest: {questId: session.quest.questId}},
            relations: ['task', 'task.quizQuestions', 'task.quizQuestions.answers'],
        });

        if (!point) {
            throw new NotFoundException(`Point with ID ${pointId} not found in this quest`);
        }

        if (!point.task) {
            throw new NotFoundException(`No task found for point with ID ${pointId}`);
        }

        const questPoints = [...(session.quest.points || [])].sort((a, b) => a.orderNum - b.orderNum);
        const passedPointIds = new Set(
            (participant?.points || []).map(pp => pp.point.questPointId)
        );

        if (!passedPointIds.has(pointId)) {
            throw new BadRequestException('You must reach the point location first before accessing its task');
        }

        let maxPassedOrderNum = -1;
        for (const qp of questPoints) {
            if (passedPointIds.has(qp.questPointId)) {
                maxPassedOrderNum = Math.max(maxPassedOrderNum, qp.orderNum);
            }
        }

        if (point.orderNum !== maxPassedOrderNum) {
            throw new BadRequestException('You can only access the task for your current point');
        }

        const completedTask = await this.participantTaskRepository.findOne({
            where: {
                participant: {participantId: participant.participantId},
                task: {questTaskId: point.task.questTaskId},
            },
        });

        if (completedTask) {
            throw new BadRequestException('Task has already been completed');
        }

        return this.mapToParticipantTaskDto(point.task);
    }

    private mapToParticipantTaskDto(task: QuestTaskEntity): ParticipantTaskResponseDto {
        const baseResponse = {
            questTaskId: task.questTaskId,
            taskType: task.taskType,
            description: task.description,
            maxDurationSeconds: task.maxDurationSeconds,
            isRequiredForNextPoint: task.isRequiredForNextPoint,
        };

        switch (task.taskType) {
            case QuestTaskType.QUIZ:
                return {
                    ...baseResponse,
                    taskType: QuestTaskType.QUIZ,
                    maxScorePointsCount: task.maxScorePointsCount,
                    successScorePointsPercent: task.successScorePointsPercent,
                    quizQuestions: (task.quizQuestions || []).map(q => ({
                        question: q.question,
                        orderNumber: q.orderNumber,
                        scorePointsCount: q.scorePointsCount,
                        answers: q.answers?.map(a => ({
                            quizAnswerId: a.quizAnswerId,
                            answer: a.answer,
                        })) || [],
                    })),
                } as ParticipantQuizTaskResponseDto;

            case QuestTaskType.CODE_WORD:
                return {
                    ...baseResponse,
                    taskType: QuestTaskType.CODE_WORD,
                    scorePointsCount: task.maxScorePointsCount,
                } as ParticipantCodeWordTaskResponseDto;

            case QuestTaskType.PHOTO:
                return {
                    ...baseResponse,
                    taskType: QuestTaskType.PHOTO,
                    scorePointsCount: task.maxScorePointsCount,
                } as ParticipantPhotoTaskResponseDto;

            default:
                throw new BadRequestException(`Unknown task type: ${task.taskType}`);
        }
    }
}