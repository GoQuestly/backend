import {BadRequestException, ForbiddenException, Injectable, NotFoundException} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {Repository} from 'typeorm';
import {QuestSessionEntity} from '@/common/entities/QuestSessionEntity';
import {QuestPointEntity} from '@/common/entities/QuestPointEntity';
import {QuestTaskEntity} from '@/common/entities/QuestTaskEntity';
import {ParticipantTaskEntity} from '@/common/entities/ParticipantTaskEntity';
import {QuizAnswerEntity} from '@/common/entities/QuizAnswerEntity';
import {ParticipantTaskQuizAnswerEntity} from '@/common/entities/ParticipantTaskQuizAnswerEntity';
import {ParticipantTaskPhotoEntity} from '@/common/entities/ParticipantTaskPhotoEntity';
import {QuestTaskType} from '@/common/enums/QuestTaskType';
import {
    ParticipantCodeWordTaskResponseDto,
    ParticipantPhotoTaskResponseDto,
    ParticipantQuizTaskResponseDto,
    ParticipantTaskResponseDto,
} from './dto/participant-task-response.dto';
import {StartTaskResponseDto} from './dto/start-task.dto';
import {
    QuizAnswerResponseDto,
    SubmitCodeWordTaskDto,
    SubmitQuizAnswerDto,
    TaskCompletionResponseDto
} from './dto/submit-task.dto';
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
        @InjectRepository(QuizAnswerEntity)
        private quizAnswerRepository: Repository<QuizAnswerEntity>,
        @InjectRepository(ParticipantTaskQuizAnswerEntity)
        private participantTaskQuizAnswerRepository: Repository<ParticipantTaskQuizAnswerEntity>,
        @InjectRepository(ParticipantTaskPhotoEntity)
        private participantTaskPhotoRepository: Repository<ParticipantTaskPhotoEntity>,
    ) {
    }

    async getTaskForPoint(sessionId: number, pointId: number, userId: number): Promise<ParticipantTaskResponseDto> {
        const {session, participant} = await this.getSessionWithParticipant(sessionId, userId);
        const point = await this.getPointWithTask(pointId, session.quest.questId);

        this.validatePointAccess(point, participant, session.quest.points, pointId, 'accessing');

        const participantTask = await this.participantTaskRepository.findOne({
            where: {
                participant: {participantId: participant.participantId},
                task: {questTaskId: point.task.questTaskId},
            },
        });

        if (participantTask) {
            if (participantTask.completedDate) {
                throw new BadRequestException('Task has already been completed');
            }

            if (participantTask.startDate) {
                const now = new Date();
                const expiresAt = new Date(participantTask.startDate.getTime() + point.task.maxDurationSeconds * 1000);

                if (now > expiresAt) {
                    throw new BadRequestException('Task time has expired');
                }
            }
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
                    quizQuestions: (task.quizQuestions || []).map(q => {
                        const correctAnswersCount = q.answers?.filter(a => a.isCorrect).length || 0;
                        return {
                            quizQuestionId: q.quizQuestionId,
                            question: q.question,
                            orderNumber: q.orderNumber,
                            scorePointsCount: q.scorePointsCount,
                            isMultipleAnswer: correctAnswersCount > 1,
                            answers: q.answers?.map(a => ({
                                quizAnswerId: a.quizAnswerId,
                                answer: a.answer,
                            })) || [],
                        };
                    }),
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

    async startTask(sessionId: number, pointId: number, userId: number): Promise<StartTaskResponseDto> {
        const {session, participant} = await this.getSessionWithParticipant(sessionId, userId);
        const point = await this.getPointWithTask(pointId, session.quest.questId, false);

        this.validatePointAccess(point, participant, session.quest.points, pointId, 'starting');

        const existingTask = await this.participantTaskRepository.findOne({
            where: {
                participant: {participantId: participant.participantId},
                task: {questTaskId: point.task.questTaskId},
            },
        });

        if (existingTask) {
            if (existingTask.completedDate) {
                throw new BadRequestException('Task has already been completed');
            }

            const expiresAt = new Date(existingTask.startDate.getTime() + point.task.maxDurationSeconds * 1000);
            return {
                participantTaskId: existingTask.participantTaskId,
                startDate: existingTask.startDate,
                expiresAt,
            };
        }

        const participantTask = this.participantTaskRepository.create({
            participant,
            task: point.task,
            startDate: new Date(),
            completedDate: null,
            scoreEarned: 0,
        });

        const savedTask = await this.participantTaskRepository.save(participantTask);

        const expiresAt = new Date(savedTask.startDate.getTime() + point.task.maxDurationSeconds * 1000);

        return {
            participantTaskId: savedTask.participantTaskId,
            startDate: savedTask.startDate,
            expiresAt,
        };
    }

    async submitQuizAnswer(
        sessionId: number,
        pointId: number,
        userId: number,
        dto: SubmitQuizAnswerDto
    ): Promise<QuizAnswerResponseDto | TaskCompletionResponseDto> {
        const {task, participantTask} = await this.validateTaskSubmission(sessionId, pointId, userId, QuestTaskType.QUIZ);

        const question = task.quizQuestions?.find(q => q.quizQuestionId === dto.questionId);
        if (!question) {
            throw new BadRequestException('Question does not belong to this quiz');
        }

        if (!dto.answerIds || dto.answerIds.length === 0) {
            throw new BadRequestException('At least one answer must be provided');
        }

        const correctAnswersCount = question.answers?.filter(a => a.isCorrect).length || 0;
        const isMultipleAnswer = correctAnswersCount > 1;

        if (!isMultipleAnswer && dto.answerIds.length > 1) {
            throw new BadRequestException('This question only accepts a single answer');
        }

        const answers = await this.quizAnswerRepository.find({
            where: dto.answerIds.map(id => ({quizAnswerId: id})),
            relations: ['question'],
        });

        if (answers.length !== dto.answerIds.length) {
            throw new BadRequestException('Some answer IDs are invalid');
        }

        for (const answer of answers) {
            if (answer.question.quizQuestionId !== dto.questionId) {
                throw new BadRequestException('All answers must belong to the specified question');
            }
        }

        const existingAnswers = await this.participantTaskQuizAnswerRepository.find({
            where: {
                participantTask: {participantTaskId: participantTask.participantTaskId},
            },
            relations: ['answer', 'answer.question'],
        });

        const alreadyAnswered = existingAnswers.some(
            ea => ea.answer.question.quizQuestionId === dto.questionId
        );

        if (alreadyAnswered) {
            throw new BadRequestException('This question has already been answered');
        }

        for (const answer of answers) {
            const participantAnswer = this.participantTaskQuizAnswerRepository.create({
                participantTask,
                answer,
                answerDate: new Date(),
            });
            await this.participantTaskQuizAnswerRepository.save(participantAnswer);
        }

        const answeredQuestionIds = new Set(
            existingAnswers.map(ea => ea.answer.question.quizQuestionId)
        );
        answeredQuestionIds.add(dto.questionId);
        const answeredCount = answeredQuestionIds.size;

        const totalQuestions = task.quizQuestions?.length || 0;
        const allAnswered = answeredCount === totalQuestions;

        if (allAnswered) {
            const allParticipantAnswers = await this.participantTaskQuizAnswerRepository.find({
                where: {
                    participantTask: {participantTaskId: participantTask.participantTaskId},
                },
                relations: ['answer', 'answer.question'],
            });

            let scoreEarned = 0;
            for (const participantAnswer of allParticipantAnswers) {
                if (participantAnswer.answer.isCorrect) {
                    const quizQuestion = task.quizQuestions.find(q => q.quizQuestionId === participantAnswer.answer.question.quizQuestionId);
                    if (quizQuestion) {
                        scoreEarned += quizQuestion.scorePointsCount;
                    }
                }
            }

            const completedDate = new Date();
            await this.participantTaskRepository.update(
                { participantTaskId: participantTask.participantTaskId },
                {
                    scoreEarned: scoreEarned,
                    completedDate: completedDate,
                }
            );

            participantTask.scoreEarned = scoreEarned;
            participantTask.completedDate = completedDate;

            const passed = (scoreEarned / task.maxScorePointsCount) * 100 >= task.successScorePointsPercent;

            return {
                success: true,
                scoreEarned,
                maxScore: task.maxScorePointsCount,
                requiredPercentage: task.successScorePointsPercent,
                passed,
                completedAt: participantTask.completedDate,
            };
        }

        return {
            success: true,
            answeredCount,
            totalQuestions,
            allAnswered
        };
    }

    async submitCodeWordTask(
        sessionId: number,
        pointId: number,
        userId: number,
        dto: SubmitCodeWordTaskDto
    ): Promise<TaskCompletionResponseDto> {
        const {task, participantTask} = await this.validateTaskSubmission(sessionId, pointId, userId, QuestTaskType.CODE_WORD);

        const isCorrect = task.codeWord.trim().toLowerCase() === dto.codeWord.trim().toLowerCase();
        const scoreEarned = isCorrect ? task.maxScorePointsCount : 0;
        const completedDate = new Date();

        await this.participantTaskRepository.update(
            { participantTaskId: participantTask.participantTaskId },
            {
                codeWord: dto.codeWord,
                scoreEarned: scoreEarned,
                completedDate: completedDate,
            }
        );

        participantTask.codeWord = dto.codeWord;
        participantTask.scoreEarned = scoreEarned;
        participantTask.completedDate = completedDate;

        return {
            success: true,
            scoreEarned,
            maxScore: task.maxScorePointsCount,
            passed: isCorrect,
            completedAt: participantTask.completedDate,
        };
    }

    async submitPhotoTask(
        sessionId: number,
        pointId: number,
        userId: number,
        photoUrl: string
    ): Promise<TaskCompletionResponseDto> {
        const {task, participantTask} = await this.validateTaskSubmission(sessionId, pointId, userId, QuestTaskType.PHOTO);

        const photo = this.participantTaskPhotoRepository.create({
            participantTask,
            photoUrl,
            uploadDate: new Date(),
            isApproved: false,
        });
        await this.participantTaskPhotoRepository.save(photo);

        const completedDate = new Date();
        await this.participantTaskRepository.update(
            { participantTaskId: participantTask.participantTaskId },
            {
                scoreEarned: task.maxScorePointsCount,
                completedDate: completedDate,
            }
        );

        participantTask.scoreEarned = task.maxScorePointsCount;
        participantTask.completedDate = completedDate;

        return {
            success: true,
            scoreEarned: task.maxScorePointsCount,
            maxScore: task.maxScorePointsCount,
            passed: true,
            completedAt: participantTask.completedDate,
        };
    }

    private async getPointWithTask(pointId: number, questId: number, includeQuizData: boolean = true): Promise<QuestPointEntity> {
        const relations = includeQuizData
            ? ['task', 'task.quizQuestions', 'task.quizQuestions.answers']
            : ['task'];

        const point = await this.questPointRepository.findOne({
            where: {questPointId: pointId, quest: {questId}},
            relations,
        });

        if (!point) {
            throw new NotFoundException(`Point with ID ${pointId} not found in this quest`);
        }

        if (!point.task) {
            throw new NotFoundException(`No task found for point with ID ${pointId}`);
        }

        return point;
    }

    private validatePointAccess(
        point: QuestPointEntity,
        participant: any,
        questPoints: QuestPointEntity[],
        pointId: number,
        action: string
    ): void {
        const sortedPoints = [...(questPoints || [])].sort((a, b) => a.orderNum - b.orderNum);
        const passedPointIds = new Set(
            (participant?.points || []).map(pp => pp.point.questPointId)
        );

        if (!passedPointIds.has(pointId)) {
            throw new BadRequestException(`You must reach the point location first before ${action} its task`);
        }

        let maxPassedOrderNum = -1;
        for (const qp of sortedPoints) {
            if (passedPointIds.has(qp.questPointId)) {
                maxPassedOrderNum = Math.max(maxPassedOrderNum, qp.orderNum);
            }
        }

        if (point.orderNum !== maxPassedOrderNum) {
            throw new BadRequestException(`You can only ${action === 'accessing' ? 'access' : action === 'starting' ? 'start' : 'submit'} the task for your current point`);
        }
    }

    private async getSessionWithParticipant(sessionId: number, userId: number) {
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

        return {session, participant};
    }

    private async validateTaskSubmission(
        sessionId: number,
        pointId: number,
        userId: number,
        expectedTaskType: QuestTaskType
    ): Promise<{ task: QuestTaskEntity; participantTask: ParticipantTaskEntity; point: QuestPointEntity }> {
        const {session, participant} = await this.getSessionWithParticipant(sessionId, userId);
        const point = await this.getPointWithTask(pointId, session.quest.questId);

        if (point.task.taskType !== expectedTaskType) {
            throw new BadRequestException(`Expected task type ${expectedTaskType} but got ${point.task.taskType}`);
        }

        this.validatePointAccess(point, participant, session.quest.points, pointId, 'submitting');

        const participantTask = await this.participantTaskRepository.findOne({
            where: {
                participant: {participantId: participant.participantId},
                task: {questTaskId: point.task.questTaskId},
            },
            relations: ['participant', 'task'],
        });

        if (!participantTask) {
            throw new BadRequestException('Task has not been started. Please start the task first');
        }

        if (participantTask.completedDate) {
            throw new BadRequestException('Task has already been completed');
        }

        const now = new Date();
        const expiresAt = new Date(participantTask.startDate.getTime() + point.task.maxDurationSeconds * 1000);

        if (now > expiresAt) {
            throw new BadRequestException('Task time has expired');
        }

        return {task: point.task, participantTask, point};
    }
}