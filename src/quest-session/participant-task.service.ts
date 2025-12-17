import {
    BadRequestException,
    ForbiddenException,
    forwardRef,
    Inject,
    Injectable,
    NotFoundException
} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {Repository, Not, IsNull, DataSource} from 'typeorm';
import {QuestSessionEntity} from '@/common/entities/quest-session.entity';
import {QuestPointEntity} from '@/common/entities/quest-point.entity';
import {QuestTaskEntity} from '@/common/entities/quest-task.entity';
import {ParticipantTaskEntity} from '@/common/entities/participant-task.entity';
import {QuizAnswerEntity} from '@/common/entities/quiz-answer.entity';
import {ParticipantTaskQuizAnswerEntity} from '@/common/entities/participant-task-quiz-answer.entity';
import {ParticipantTaskPhotoEntity} from '@/common/entities/participant-task-photo.entity';
import {QuestTaskType} from '@/common/enums/quest-task-type';
import {
    ParticipantCodeWordTaskResponseDto,
    ParticipantPhotoTaskResponseDto,
    ParticipantQuizTaskResponseDto,
    ParticipantTaskResponseDto,
} from './dto/participant-task-response.dto';
import {StartTaskResponseDto} from './dto/start-task.dto';
import {
    SubmitQuizAnswerDto
} from './dto/submit-task.dto';
import {isSessionActive} from '@/common/utils/session.util';
import {ActiveSessionGateway} from './active-session.gateway';
import {ParticipantStatus} from '@/common/enums/participant-status';
import {PendingPhotoDto, PhotoModerationActionDto, PhotoModerationResponseDto} from './dto/photo-moderation.dto';
import {ParticipantEntity} from '@/common/entities/participant.entity';
import {ParticipantPointEntity} from '@/common/entities/participant-point.entity';
import {RejectionReason} from '@/common/enums/rejection-reason';
import {TaskCompletionResponseDto} from "@/quest-session/dto/task-completion-response.dto";
import {SubmitCodeWordTaskDto} from "@/quest-session/dto/submit-code-word-task.dto";
import {QuizAnswerResponseDto} from "@/quest-session/dto/quiz-answer-response.dto";
import {NotificationService} from '@/notification/notification.service';
import {SessionEndValidatorService} from './session-end-validator.service';

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
        @InjectRepository(ParticipantEntity)
        private participantRepository: Repository<ParticipantEntity>,
        @InjectRepository(ParticipantPointEntity)
        private participantPointRepository: Repository<ParticipantPointEntity>,
        @Inject(forwardRef(() => ActiveSessionGateway))
        private activeSessionGateway: ActiveSessionGateway,
        private notificationService: NotificationService,
        @Inject(forwardRef(() => SessionEndValidatorService))
        private sessionEndValidatorService: SessionEndValidatorService,
        private dataSource: DataSource,
    ) {
    }

    async getTaskForPoint(sessionId: number, pointId: number, userId: number): Promise<ParticipantTaskResponseDto> {
        const {session, participant} = await this.getSessionWithParticipant(sessionId, userId);
        const point = await this.getPointWithTask(pointId, session.quest.questId);

        await this.validatePointAccess(participant, pointId, 'accessing');

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

        await this.validatePointAccess(participant, pointId, 'starting');

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

            if (existingTask.startDate) {
                throw new BadRequestException('Task has already been started');
            }
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
            questPointId: point.questPointId,
            startDate: savedTask.startDate,
            expiresAt,
        };
    }

    async getActiveTask(sessionId: number, userId: number): Promise<StartTaskResponseDto | null> {
        const {participant} = await this.getSessionWithParticipant(sessionId, userId);

        const activeTask = await this.participantTaskRepository.findOne({
            where: {
                participant: {participantId: participant.participantId},
                startDate: Not(IsNull()),
                completedDate: IsNull(),
            },
            relations: ['task', 'task.point'],
        });

        if (!activeTask) {
            return null;
        }

        const now = new Date();
        const expiresAt = new Date(activeTask.startDate.getTime() + activeTask.task.maxDurationSeconds * 1000);

        if (now > expiresAt) {
            return null;
        }

        return {
            participantTaskId: activeTask.participantTaskId,
            questPointId: activeTask.task.point.questPointId,
            startDate: activeTask.startDate,
            expiresAt,
        };
    }

    async submitQuizAnswer(
        sessionId: number,
        pointId: number,
        userId: number,
        dto: SubmitQuizAnswerDto
    ): Promise<QuizAnswerResponseDto | TaskCompletionResponseDto> {
        const {task, participantTask, point, userName} = await this.validateTaskSubmission(sessionId, pointId, userId, QuestTaskType.QUIZ);

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

            await this.sendTaskCompletionNotifications(
                sessionId,
                userId,
                userName,
                task.questTaskId,
                point.name,
                scoreEarned,
                completedDate
            );

            await this.checkAndDisqualifyIfRequired(
                sessionId,
                participantTask.participant.participantId,
                task.questTaskId
            );

            await this.checkAndSetFinishDateIfComplete(
                sessionId,
                participantTask.participant.participantId,
                pointId
            );

            await this.sessionEndValidatorService.checkSessionCompletion(sessionId);

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
        const {task, participantTask, point, userName} = await this.validateTaskSubmission(sessionId, pointId, userId, QuestTaskType.CODE_WORD);

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

        await this.sendTaskCompletionNotifications(
            sessionId,
            userId,
            userName,
            task.questTaskId,
            point.name,
            scoreEarned,
            completedDate
        );

        await this.checkAndDisqualifyIfRequired(
            sessionId,
            participantTask.participant.participantId,
            task.questTaskId
        );

        await this.checkAndSetFinishDateIfComplete(
            sessionId,
            participantTask.participant.participantId,
            pointId
        );

        await this.sessionEndValidatorService.checkSessionCompletion(sessionId);

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
        const {task, participantTask, point, userName} = await this.validateTaskSubmission(sessionId, pointId, userId, QuestTaskType.PHOTO);

        const photo = this.participantTaskPhotoRepository.create({
            participantTask,
            photoUrl,
            uploadDate: new Date(),
            isApproved: null,
        });
        const savedPhoto = await this.participantTaskPhotoRepository.save(photo);

        const completedDate = new Date();
        await this.participantTaskRepository.update(
            { participantTaskId: participantTask.participantTaskId },
            {
                scoreEarned: 0,
                completedDate: completedDate,
            }
        );

        participantTask.scoreEarned = 0;
        participantTask.completedDate = completedDate;

        const session = await this.sessionRepository.findOne({
            where: { questSessionId: sessionId },
            relations: ['quest', 'quest.organizer'],
        });

        if (session) {
            await this.activeSessionGateway.notifyPhotoSubmitted(
                sessionId,
                session.quest.organizer.userId,
                {
                    participantTaskPhotoId: savedPhoto.participantTaskPhotoId,
                    participantTaskId: participantTask.participantTaskId,
                    userId,
                    userName,
                    questTaskId: task.questTaskId,
                    taskDescription: task.description,
                    pointName: point.name,
                    photoUrl: savedPhoto.photoUrl,
                    uploadDate: savedPhoto.uploadDate,
                }
            );
        }

        await this.sendTaskCompletionNotifications(
            sessionId,
            userId,
            userName,
            task.questTaskId,
            point.name,
            0,
            completedDate
        );

        return {
            success: true,
            scoreEarned: 0,
            maxScore: task.maxScorePointsCount,
            passed: false,
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

    private async validatePointAccess(
        participant: any,
        pointId: number,
        action: string
    ): Promise<void> {
        const passedPoints = await this.participantPointRepository.find({
            where: {
                participant: { participantId: participant.participantId }
            },
            relations: ['point']
        });

        const passedPointIds = new Set(
            passedPoints.map(pp => pp.point.questPointId)
        );

        if (!passedPointIds.has(pointId)) {
            throw new BadRequestException(`You must reach the point location first before ${action} its task`);
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

        if (participant.participationStatus === ParticipantStatus.DISQUALIFIED || participant.participationStatus === ParticipantStatus.REJECTED) {
            const message = participant.participationStatus === ParticipantStatus.REJECTED
                ? 'You have been rejected from this session'
                : 'You have been disqualified from this session';
            throw new ForbiddenException(message);
        }

        return {session, participant};
    }

    private async validateTaskSubmission(
        sessionId: number,
        pointId: number,
        userId: number,
        expectedTaskType: QuestTaskType
    ): Promise<{ task: QuestTaskEntity; participantTask: ParticipantTaskEntity; point: QuestPointEntity; userName: string }> {
        const {session, participant} = await this.getSessionWithParticipant(sessionId, userId);
        const point = await this.getPointWithTask(pointId, session.quest.questId);

        if (point.task.taskType !== expectedTaskType) {
            throw new BadRequestException(`Expected task type ${expectedTaskType} but got ${point.task.taskType}`);
        }

        await this.validatePointAccess(participant, pointId, 'submitting');

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

        return {task: point.task, participantTask, point, userName: participant.user.name};
    }

    private async sendTaskCompletionNotifications(
        sessionId: number,
        userId: number,
        userName: string,
        taskId: number,
        pointName: string,
        scoreEarned: number,
        completedAt: Date
    ): Promise<void> {
        try {
            const session = await this.sessionRepository.findOne({
                where: { questSessionId: sessionId },
                relations: [
                    'quest',
                    'quest.organizer',
                    'participants',
                    'participants.user',
                    'participants.tasks',
                ],
            });

            if (!session) {
                return;
            }

            const organizerUserId = session.quest.organizer.userId;
            const currentParticipant = session.participants.find(p => p.user.userId === userId);
            const totalScore = currentParticipant?.tasks
                ?.filter(t => t.completedDate !== null)
                .reduce((sum, t) => sum + (t.scoreEarned || 0), 0) || 0;

            await this.activeSessionGateway.notifyTaskCompleted(sessionId, organizerUserId, {
                userId,
                userName,
                taskId,
                pointName,
                scoreEarned,
                totalScore,
                completedAt,
            });

            if (scoreEarned > 0) {
                const participantScores = session.participants
                    .filter(p => p.participationStatus === ParticipantStatus.APPROVED)
                    .map(p => {
                        const completedTasks = p.tasks?.filter(t => t.completedDate !== null) || [];
                        return {
                            userId: p.user.userId,
                            userName: p.user.name,
                            totalScore: completedTasks.reduce((sum, t) => sum + (t.scoreEarned || 0), 0),
                            completedTasksCount: completedTasks.length,
                        };
                    })
                    .sort((a, b) => b.totalScore - a.totalScore);

                await this.activeSessionGateway.notifyScoresUpdated(sessionId, participantScores);
            }
        } catch (error) {
            console.error('[ParticipantTaskService] Error sending task completion notifications:', error.message);
        }
    }

    private async checkAndDisqualifyIfRequired(
        sessionId: number,
        participantId: number,
        taskId: number,
        transactionalEntityManager?: any
    ): Promise<void> {
        try {
            const em = transactionalEntityManager || this.dataSource.manager;

            const task = await em.findOne(QuestTaskEntity, {
                where: { questTaskId: taskId },
            });

            if (!task || !task.isRequiredForNextPoint) {
                return;
            }

            const participantTask = await em.findOne(ParticipantTaskEntity, {
                where: {
                    participant: { participantId },
                    task: { questTaskId: taskId },
                },
                relations: ['photo'],
            });

            if (!participantTask || !participantTask.completedDate) {
                return;
            }

            let passed = false;

            if (task.taskType === QuestTaskType.PHOTO) {
                if (participantTask.photo?.isApproved === null) {
                    return;
                }
                passed = participantTask.photo?.isApproved === true;
            } else if (task.taskType === QuestTaskType.CODE_WORD) {
                passed = participantTask.scoreEarned > 0;
            } else if (task.taskType === QuestTaskType.QUIZ) {
                const scorePercent = (participantTask.scoreEarned / task.maxScorePointsCount) * 100;
                passed = scorePercent >= task.successScorePointsPercent;
            }

            if (!passed) {
                const session = await em.findOne(QuestSessionEntity, {
                    where: { questSessionId: sessionId },
                    relations: ['quest', 'quest.organizer'],
                });

                if (!session) {
                    return;
                }

                const participant = await em.findOne(ParticipantEntity, {
                    where: { participantId },
                    relations: ['user'],
                });

                if (!participant) {
                    return;
                }

                participant.participationStatus = ParticipantStatus.DISQUALIFIED;
                participant.rejectionReason = RejectionReason.REQUIRED_TASK_NOT_COMPLETED;
                await em.save(ParticipantEntity, participant);

                await this.activeSessionGateway.notifyParticipantDisqualified(sessionId, session.quest.organizer.userId, participant);

                console.log(`[ParticipantTaskService] Participant ${participantId} disqualified - required task not passed`);
            }
        } catch (error) {
            console.error('[ParticipantTaskService] Error checking disqualification:', error.message);
        }
    }

    private async checkAndSetFinishDateIfComplete(
        sessionId: number,
        participantId: number,
        pointId: number,
        transactionalEntityManager?: any
    ): Promise<void> {
        try {
            const em = transactionalEntityManager || this.dataSource.manager;

            const session = await em.findOne(QuestSessionEntity, {
                where: { questSessionId: sessionId },
                relations: ['quest', 'quest.points', 'quest.points.task'],
            });

            if (!session) {
                return;
            }

            const participant = await em.findOne(ParticipantEntity, {
                where: { participantId },
                relations: ['points', 'tasks', 'tasks.photo'],
            });

            if (!participant || participant.finishDate) {
                return;
            }

            const lastPoint = session.quest.points.reduce((max, point) =>
                point.orderNum > max.orderNum ? point : max,
                session.quest.points[0]
            );

            if (pointId === lastPoint.questPointId) {
                const totalQuestPoints = session.quest.points.length;
                const passedPointsCount = participant.points?.length || 0;

                const totalQuestTasks = session.quest.points.filter(p => p.task !== null).length;
                const completedTasksCount = participant.tasks?.filter(t => t.completedDate !== null).length || 0;

                const hasUnmoderatedPhotos = participant.tasks?.some(t =>
                    t.completedDate !== null &&
                    t.photo &&
                    t.photo.isApproved === null
                ) || false;

                if (passedPointsCount === totalQuestPoints &&
                    completedTasksCount === totalQuestTasks &&
                    !hasUnmoderatedPhotos) {
                    participant.finishDate = new Date();
                    await em.save(ParticipantEntity, participant);

                    console.log(`[ParticipantTaskService] User ${participantId} FINISHED the quest: passed ${passedPointsCount}/${totalQuestPoints} points, completed ${completedTasksCount}/${totalQuestTasks} tasks, all photos moderated.`);
                }
            }
        } catch (error) {
            console.error('[ParticipantTaskService] Error setting finish date:', error.message);
        }
    }

    async getPendingPhotos(sessionId: number, organizerUserId: number): Promise<PendingPhotoDto[]> {
        const session = await this.sessionRepository.findOne({
            where: { questSessionId: sessionId },
            relations: ['quest', 'quest.organizer'],
        });

        if (!session) {
            throw new NotFoundException(`Session with ID ${sessionId} not found`);
        }

        if (session.quest.organizer.userId !== organizerUserId) {
            throw new ForbiddenException('You are not the organizer of this session');
        }

        if (!isSessionActive(session)) {
            throw new BadRequestException('Session is not active');
        }

        const pendingPhotos = await this.participantTaskPhotoRepository.find({
            where: {
                isApproved: IsNull(),
                participantTask: {
                    completedDate: Not(IsNull()),
                    participant: {
                        session: { questSessionId: sessionId },
                    },
                },
            },
            relations: [
                'participantTask',
                'participantTask.participant',
                'participantTask.participant.user',
                'participantTask.task',
                'participantTask.task.point',
            ],
            order: {
                uploadDate: 'ASC',
            },
        });

        return pendingPhotos.map(photo => ({
            participantTaskPhotoId: photo.participantTaskPhotoId,
            participantTaskId: photo.participantTask.participantTaskId,
            userId: photo.participantTask.participant.user.userId,
            userName: photo.participantTask.participant.user.name,
            questTaskId: photo.participantTask.task.questTaskId,
            taskDescription: photo.participantTask.task.description,
            pointName: photo.participantTask.task.point.name,
            photoUrl: photo.photoUrl,
            uploadDate: photo.uploadDate,
        }));
    }

    async moderatePhoto(
        sessionId: number,
        photoId: number,
        organizerUserId: number,
        dto: PhotoModerationActionDto
    ): Promise<PhotoModerationResponseDto> {
        const session = await this.sessionRepository.findOne({
            where: { questSessionId: sessionId },
            relations: ['quest', 'quest.organizer'],
        });

        if (!session) {
            throw new NotFoundException(`Session with ID ${sessionId} not found`);
        }

        if (session.quest.organizer.userId !== organizerUserId) {
            throw new ForbiddenException('You are not the organizer of this session');
        }

        const photo = await this.participantTaskPhotoRepository.findOne({
            where: { participantTaskPhotoId: photoId },
            relations: [
                'participantTask',
                'participantTask.participant',
                'participantTask.participant.session',
                'participantTask.participant.user',
                'participantTask.task',
                'participantTask.task.point',
            ],
        });

        if (!photo) {
            throw new NotFoundException(`Photo with ID ${photoId} not found`);
        }

        if (photo.participantTask.participant.session.questSessionId !== sessionId) {
            throw new BadRequestException('Photo does not belong to this session');
        }

        if (photo.isApproved === true) {
            throw new BadRequestException('Photo has already been moderated and approved');
        }

        if (!dto.approved && !dto.rejectionReason) {
            throw new BadRequestException('Rejection reason is required when rejecting a photo');
        }

        const participantTask = photo.participantTask;
        const task = participantTask.task;
        const scoreAdjustment = dto.approved ? task.maxScorePointsCount : 0;
        const participantId = participantTask.participant.participantId;
        const taskId = task.questTaskId;
        const pointId = task.point.questPointId;
        const userId = participantTask.participant.user.userId;
        const userName = participantTask.participant.user.name;

        let totalScore: number;

        await this.dataSource.transaction(async (transactionalEntityManager) => {
            await transactionalEntityManager.update(
                ParticipantTaskEntity,
                { participantTaskId: participantTask.participantTaskId },
                { scoreEarned: scoreAdjustment }
            );

            await transactionalEntityManager.update(
                ParticipantTaskPhotoEntity,
                { participantTaskPhotoId: photoId },
                { isApproved: dto.approved }
            );

            const participant = await transactionalEntityManager.findOne(ParticipantEntity, {
                where: { participantId },
                relations: ['tasks'],
            });

            totalScore = participant.tasks
                ?.filter(t => t.completedDate !== null)
                .reduce((sum, t) => sum + (t.scoreEarned || 0), 0) || 0;

            await this.checkAndDisqualifyIfRequired(
                sessionId,
                participantId,
                taskId,
                transactionalEntityManager
            );

            await this.checkAndSetFinishDateIfComplete(
                sessionId,
                participantId,
                pointId,
                transactionalEntityManager
            );
        });

        await this.activeSessionGateway.notifyPhotoModerated(
            sessionId,
            organizerUserId,
            userId,
            {
                participantTaskPhotoId: photo.participantTaskPhotoId,
                participantTaskId: participantTask.participantTaskId,
                userId,
                userName,
                questTaskId: taskId,
                taskDescription: task.description,
                pointName: task.point.name,
                photoUrl: photo.photoUrl,
                approved: dto.approved,
                rejectionReason: dto.rejectionReason,
                scoreAdjustment,
                totalScore,
            }
        );

        await this.notificationService.sendPhotoModerationNotification(
            userId,
            sessionId,
            session.quest.title,
            task.description,
            dto.approved,
            scoreAdjustment,
            totalScore,
            dto.rejectionReason
        );

        const allParticipants = await this.participantRepository.find({
            where: { session: { questSessionId: sessionId } },
            relations: ['user', 'tasks'],
        });

        const participantScores = allParticipants
            .filter(p => p.participationStatus === ParticipantStatus.APPROVED)
            .map(p => {
                const completedTasks = p.tasks?.filter(t => t.completedDate !== null) || [];
                return {
                    userId: p.user.userId,
                    userName: p.user.name,
                    totalScore: completedTasks.reduce((sum, t) => sum + (t.scoreEarned || 0), 0),
                    completedTasksCount: completedTasks.length,
                };
            })
            .sort((a, b) => b.totalScore - a.totalScore);

        await this.activeSessionGateway.notifyScoresUpdated(sessionId, participantScores);

        await this.sessionEndValidatorService.checkSessionCompletion(sessionId);

        return {
            success: true,
            message: dto.approved ? 'Photo approved successfully' : 'Photo rejected',
            scoreAdjustment,
            totalScore,
        };
    }
}