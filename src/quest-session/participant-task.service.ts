import {
    BadRequestException,
    ForbiddenException,
    forwardRef,
    Inject,
    Injectable,
    NotFoundException
} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {Repository, Not, IsNull} from 'typeorm';
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
import {RejectionReason} from '@/common/enums/rejection-reason';
import {TaskCompletionResponseDto} from "@/quest-session/dto/task-completion-response.dto";
import {SubmitCodeWordTaskDto} from "@/quest-session/dto/submit-code-word-task.dto";
import {QuizAnswerResponseDto} from "@/quest-session/dto/quiz-answer-response.dto";
import {NotificationService} from '@/notification/notification.service';

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
        @Inject(forwardRef(() => ActiveSessionGateway))
        private activeSessionGateway: ActiveSessionGateway,
        private notificationService: NotificationService,
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
                task,
                passed
            );

            await this.checkAndSetFinishDateIfComplete(
                sessionId,
                participantTask.participant.participantId,
                pointId
            );

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
            task,
            isCorrect
        );

        await this.checkAndSetFinishDateIfComplete(
            sessionId,
            participantTask.participant.participantId,
            pointId
        );

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
        task: QuestTaskEntity,
        passed: boolean
    ): Promise<void> {
        try {
            if (!task.isRequiredForNextPoint) {
                return;
            }

            if (!passed) {
                const session = await this.sessionRepository.findOne({
                    where: { questSessionId: sessionId },
                    relations: ['quest', 'quest.organizer'],
                });

                if (!session) {
                    return;
                }

                const participant = await this.participantRepository.findOne({
                    where: { participantId },
                    relations: ['user'],
                });

                if (!participant) {
                    return;
                }

                participant.participationStatus = ParticipantStatus.DISQUALIFIED;
                participant.rejectionReason = RejectionReason.REQUIRED_TASK_NOT_COMPLETED;
                await this.participantRepository.save(participant);

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
        pointId: number
    ): Promise<void> {
        try {
            const session = await this.sessionRepository.findOne({
                where: { questSessionId: sessionId },
                relations: ['quest', 'quest.points', 'quest.points.task'],
            });

            if (!session) {
                return;
            }

            const participant = await this.participantRepository.findOne({
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
                    await this.participantRepository.save(participant);

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

        await this.participantTaskRepository.update(
            { participantTaskId: participantTask.participantTaskId },
            { scoreEarned: scoreAdjustment }
        );

        await this.participantTaskPhotoRepository.update(
            { participantTaskPhotoId: photoId },
            { isApproved: dto.approved }
        );

        const participant = await this.participantRepository.findOne({
            where: { participantId: participantTask.participant.participantId },
            relations: ['tasks'],
        });

        const totalScore = participant.tasks
            ?.filter(t => t.completedDate !== null)
            .reduce((sum, t) => sum + (t.scoreEarned || 0), 0) || 0;

        await this.activeSessionGateway.notifyPhotoModerated(
            sessionId,
            organizerUserId,
            participantTask.participant.user.userId,
            {
                participantTaskPhotoId: photo.participantTaskPhotoId,
                participantTaskId: participantTask.participantTaskId,
                userId: participantTask.participant.user.userId,
                userName: participantTask.participant.user.name,
                questTaskId: task.questTaskId,
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
            participantTask.participant.user.userId,
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

        await this.checkAndDisqualifyIfRequired(
            sessionId,
            participantTask.participant.participantId,
            task,
            dto.approved
        );

        await this.checkAndSetFinishDateIfComplete(
            sessionId,
            participantTask.participant.participantId,
            task.point.questPointId
        );

        return {
            success: true,
            message: dto.approved ? 'Photo approved successfully' : 'Photo rejected',
            scoreAdjustment,
            totalScore,
        };
    }
}