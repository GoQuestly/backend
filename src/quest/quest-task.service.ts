import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuestTaskEntity } from '@/common/entities/QuestTaskEntity';
import { QuizQuestionEntity } from '@/common/entities/QuizQuestionEntity';
import { QuizAnswerEntity } from '@/common/entities/QuizAnswerEntity';
import { QuestPointEntity } from '@/common/entities/QuestPointEntity';
import { QuestTaskType } from '@/common/enums/QuestTaskType';
import {
    CreateQuizTaskDto,
    UpdateQuizTaskDto,
    QuizQuestionDto,
    CreateCodeWordTaskDto,
    UpdateCodeWordTaskDto,
    CreatePhotoTaskDto,
    UpdatePhotoTaskDto,
    QuestTaskResponseDto,
    QuizTaskResponseDto,
    CodeWordTaskResponseDto,
    PhotoTaskResponseDto
} from './dto';

@Injectable()
export class QuestTaskService {
    constructor(
        @InjectRepository(QuestTaskEntity)
        private questTaskRepository: Repository<QuestTaskEntity>,
        @InjectRepository(QuizQuestionEntity)
        private quizQuestionRepository: Repository<QuizQuestionEntity>,
        @InjectRepository(QuizAnswerEntity)
        private quizAnswerRepository: Repository<QuizAnswerEntity>,
        @InjectRepository(QuestPointEntity)
        private questPointRepository: Repository<QuestPointEntity>,
    ) {}

    private async validateQuestPointHasNoTask(questPointId: number): Promise<QuestPointEntity> {
        const questPoint = await this.questPointRepository.findOne({
            where: { questPointId },
            relations: ['task'],
        });

        if (!questPoint) {
            throw new NotFoundException(`Quest point with ID ${questPointId} not found`);
        }

        if (questPoint.task) {
            throw new ConflictException(`Quest point with ID ${questPointId} already has a task`);
        }

        return questPoint;
    }

    async createQuizTask(dto: CreateQuizTaskDto, questPointId: number): Promise<QuizTaskResponseDto> {
        const questPoint = await this.validateQuestPointHasNoTask(questPointId);

        const questTask = this.questTaskRepository.create({
            taskType: QuestTaskType.QUIZ,
            description: dto.description,
            maxScorePointsCount: dto.maxScorePointsCount,
            maxDurationSeconds: dto.maxDurationSeconds,
            isRequiredForNextPoint: dto.isRequiredForNextPoint,
            point: questPoint,
            codeWord: '',
            successScorePointsPercent: dto.successScorePointsPercent,
        });

        await this.questTaskRepository.save(questTask);
        await this.createQuizQuestions(questTask, dto.quizQuestions);

        return this.findById(questTask.questTaskId) as Promise<QuizTaskResponseDto>;
    }

    async createCodeWordTask(dto: CreateCodeWordTaskDto, questPointId: number): Promise<CodeWordTaskResponseDto> {
        const questPoint = await this.validateQuestPointHasNoTask(questPointId);

        const questTask = await this.questTaskRepository.save({
            taskType: QuestTaskType.CODE_WORD,
            description: dto.description,
            maxScorePointsCount: dto.scorePointsCount,
            maxDurationSeconds: dto.maxDurationSeconds,
            isRequiredForNextPoint: dto.isRequiredForNextPoint,
            point: questPoint,
            codeWord: dto.codeWord,
            successScorePointsPercent: 100,
        });

        return this.findById(questTask.questTaskId) as Promise<CodeWordTaskResponseDto>;
    }

    async createPhotoTask(dto: CreatePhotoTaskDto, questPointId: number): Promise<PhotoTaskResponseDto> {
        const questPoint = await this.validateQuestPointHasNoTask(questPointId);

        const questTask = await this.questTaskRepository.save({
            taskType: QuestTaskType.PHOTO,
            description: dto.description,
            maxScorePointsCount: dto.scorePointsCount,
            maxDurationSeconds: dto.maxDurationSeconds,
            isRequiredForNextPoint: dto.isRequiredForNextPoint,
            point: questPoint,
            codeWord: '',
            successScorePointsPercent: 100,
        });

        return this.findById(questTask.questTaskId) as Promise<PhotoTaskResponseDto>;
    }

    private async createQuizQuestions(task: QuestTaskEntity, questions: QuizQuestionDto[]): Promise<void> {
        for (const questionDto of questions) {
            const question = this.quizQuestionRepository.create({
                question: questionDto.question,
                orderNumber: questionDto.orderNumber,
                scorePointsCount: questionDto.scorePointsCount,
                task: task,
            });

            const savedQuestion = await this.quizQuestionRepository.save(question);

            const answers = questionDto.answers.map(answerDto =>
                this.quizAnswerRepository.create({
                    answer: answerDto.answer,
                    isCorrect: answerDto.isCorrect,
                    question: savedQuestion,
                })
            );

            await this.quizAnswerRepository.save(answers);
        }
    }

    async findById(id: number): Promise<QuestTaskResponseDto> {
        const task = await this.questTaskRepository.findOne({
            where: { questTaskId: id },
            relations: ['quizQuestions', 'quizQuestions.answers'],
        });

        if (!task) {
            throw new NotFoundException(`Quest task with ID ${id} not found`);
        }

        return this.mapToResponseDto(task);
    }

    async findAll(): Promise<QuestTaskResponseDto[]> {
        const tasks = await this.questTaskRepository.find({
            relations: ['quizQuestions', 'quizQuestions.answers'],
        });

        return tasks.map(task => this.mapToResponseDto(task));
    }

    async updateQuizTask(id: number, dto: UpdateQuizTaskDto): Promise<QuizTaskResponseDto> {
        const task = await this.questTaskRepository.findOne({
            where: { questTaskId: id },
            relations: ['quizQuestions', 'quizQuestions.answers'],
        });

        if (!task) {
            throw new NotFoundException(`Quest task with ID ${id} not found`);
        }

        if (task.taskType !== QuestTaskType.QUIZ) {
            throw new BadRequestException('Task is not a quiz task');
        }

        Object.assign(task, {
            description: dto.description,
            maxScorePointsCount: dto.maxScorePointsCount,
            maxDurationSeconds: dto.maxDurationSeconds,
            isRequiredForNextPoint: dto.isRequiredForNextPoint,
            successScorePointsPercent: dto.successScorePointsPercent,
        });

        await this.questTaskRepository.save(task);

        await this.quizQuestionRepository.delete({ task: { questTaskId: id } });
        await this.createQuizQuestions(task, dto.quizQuestions);

        return this.findById(id) as Promise<QuizTaskResponseDto>;
    }

    async updateCodeWordTask(id: number, dto: UpdateCodeWordTaskDto): Promise<CodeWordTaskResponseDto> {
        const task = await this.questTaskRepository.findOne({
            where: { questTaskId: id },
        });

        if (!task) {
            throw new NotFoundException(`Quest task with ID ${id} not found`);
        }

        if (task.taskType !== QuestTaskType.CODE_WORD) {
            throw new BadRequestException('Task is not a code word task');
        }

        Object.assign(task, {
            description: dto.description,
            maxScorePointsCount: dto.scorePointsCount,
            maxDurationSeconds: dto.maxDurationSeconds,
            isRequiredForNextPoint: dto.isRequiredForNextPoint,
            codeWord: dto.codeWord,
        });

        await this.questTaskRepository.save(task);

        return this.findById(id) as Promise<CodeWordTaskResponseDto>;
    }

    async updatePhotoTask(id: number, dto: UpdatePhotoTaskDto): Promise<PhotoTaskResponseDto> {
        const task = await this.questTaskRepository.findOne({
            where: { questTaskId: id },
        });

        if (!task) {
            throw new NotFoundException(`Quest task with ID ${id} not found`);
        }

        if (task.taskType !== QuestTaskType.PHOTO) {
            throw new BadRequestException('Task is not a photo task');
        }

        Object.assign(task, {
            description: dto.description,
            maxScorePointsCount: dto.scorePointsCount,
            maxDurationSeconds: dto.maxDurationSeconds,
            isRequiredForNextPoint: dto.isRequiredForNextPoint,
        });

        await this.questTaskRepository.save(task);

        return this.findById(id) as Promise<PhotoTaskResponseDto>;
    }

    async delete(id: number): Promise<void> {
        const task = await this.questTaskRepository.findOne({
            where: { questTaskId: id },
        });

        if (!task) {
            throw new NotFoundException(`Quest task with ID ${id} not found`);
        }

        await this.questTaskRepository.remove(task);
    }

    private mapToResponseDto(task: QuestTaskEntity): QuestTaskResponseDto {
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
                    quizQuestions: task.quizQuestions || [],
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
                throw new BadRequestException(`Unknown task type: ${task.taskType}`);
        }
    }
}