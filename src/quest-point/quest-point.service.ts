import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuestPointEntity } from '@/common/entities/QuestPointEntity';
import { QuestEntity } from '@/common/entities/QuestEntity';
import { QuestTaskEntity } from '@/common/entities/QuestTaskEntity';
import { QuestTaskType } from '@/common/enums/QuestTaskType';
import { CreateQuestPointDto } from './dto/create-quest-point.dto';
import { UpdateQuestPointDto } from './dto/update-quest-point.dto';
import { QuestPointResponseDto } from './dto/quest-point-response.dto';
import {CodeWordTaskResponseDto, PhotoTaskResponseDto, QuizTaskResponseDto} from "@/quest-task/dto";


@Injectable()
export class QuestPointService {
    constructor(
        @InjectRepository(QuestPointEntity)
        private questPointRepository: Repository<QuestPointEntity>,
        @InjectRepository(QuestEntity)
        private questRepository: Repository<QuestEntity>,
    ) {}

    async findAll(questId: number, organizerId: number): Promise<QuestPointResponseDto[]> {
        const quest = await this.questRepository.findOne({
            where: { questId },
            relations: ['organizer'],
        });

        if (!quest) {
            throw new NotFoundException('Quest not found');
        }

        if (quest.organizer.userId !== organizerId) {
            throw new ForbiddenException('Only the quest organizer can view quest points');
        }

        const points = await this.questPointRepository.find({
            where: { quest: { questId } },
            relations: ['task', 'task.quizQuestions', 'task.quizQuestions.answers'],
            order: { orderNum: 'ASC' },
        });

        return points.map(point => this.mapToResponseDto(point));
    }

    async create(questId: number, dto: CreateQuestPointDto, organizerId: number): Promise<QuestPointResponseDto> {
        const quest = await this.questRepository.findOne({
            where: { questId },
            relations: ['organizer'],
        });

        if (!quest) {
            throw new NotFoundException('Quest not found');
        }

        if (quest.organizer.userId !== organizerId) {
            throw new ForbiddenException('Only the quest organizer can create quest points');
        }

        const point = this.questPointRepository.create({
            ...dto,
            quest,
        });

        const savedPoint = await this.questPointRepository.save(point);

        return this.mapToResponseDto(savedPoint);
    }

    async update(pointId: number, dto: UpdateQuestPointDto, organizerId: number): Promise<QuestPointResponseDto> {
        const point = await this.questPointRepository.findOne({
            where: { questPointId: pointId },
            relations: ['quest', 'quest.organizer', 'task', 'task.quizQuestions', 'task.quizQuestions.answers'],
        });

        if (!point) {
            throw new NotFoundException('Quest point not found');
        }

        if (point.quest.organizer.userId !== organizerId) {
            throw new ForbiddenException('Only the quest organizer can update quest points');
        }

        if (dto.name !== undefined) point.name = dto.name;
        if (dto.latitude !== undefined) point.latitude = dto.latitude;
        if (dto.longitude !== undefined) point.longitude = dto.longitude;
        if (dto.orderNum !== undefined) point.orderNum = dto.orderNum;

        const savedPoint = await this.questPointRepository.save(point);

        return this.mapToResponseDto(savedPoint);
    }

    async remove(pointId: number, organizerId: number): Promise<void> {
        const point = await this.questPointRepository.findOne({
            where: { questPointId: pointId },
            relations: ['quest', 'quest.organizer'],
        });

        if (!point) {
            throw new NotFoundException('Quest point not found');
        }

        if (point.quest.organizer.userId !== organizerId) {
            throw new ForbiddenException('Only the quest organizer can remove quest points');
        }

        await this.questPointRepository.remove(point);
    }

    private mapToResponseDto(point: QuestPointEntity): QuestPointResponseDto {
        return {
            questPointId: point.questPointId,
            name: point.name,
            latitude: point.latitude,
            longitude: point.longitude,
            orderNum: point.orderNum,
            task: point.task ? this.mapTaskToResponseDto(point.task) : null,
        };
    }

    private mapTaskToResponseDto(task: QuestTaskEntity): QuizTaskResponseDto | CodeWordTaskResponseDto | PhotoTaskResponseDto {
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
                    quizQuestions: task.quizQuestions?.map(q => ({
                        question: q.question,
                        orderNumber: q.orderNumber,
                        scorePointsCount: q.scorePointsCount,
                        answers: q.answers?.map(a => ({
                            answer: a.answer,
                            isCorrect: a.isCorrect,
                        })) || [],
                    })) || [],
                } as QuizTaskResponseDto;

            case QuestTaskType.CODE_WORD:
                return {
                    ...baseResponse,
                    taskType: QuestTaskType.CODE_WORD,
                    scorePointsCount: task.maxScorePointsCount,
                    codeWord: task.codeWord,
                } as CodeWordTaskResponseDto;

            case QuestTaskType.PHOTO:
                return {
                    ...baseResponse,
                    taskType: QuestTaskType.PHOTO,
                    scorePointsCount: task.maxScorePointsCount,
                } as PhotoTaskResponseDto;

            default:
                return null;
        }
    }
}