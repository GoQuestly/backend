import { Injectable, Logger, forwardRef, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ParticipantTaskEntity } from '@/common/entities/participant-task.entity';
import { QuestTaskEntity } from '@/common/entities/quest-task.entity';
import { ParticipantEntity } from '@/common/entities/participant.entity';
import { ParticipantTaskQuizAnswerEntity } from '@/common/entities/participant-task-quiz-answer.entity';
import { QuestTaskType } from '@/common/enums/quest-task-type';
import { ParticipantStatus } from '@/common/enums/participant-status';
import { RejectionReason } from '@/common/enums/rejection-reason';
import { ActiveSessionGateway } from './active-session.gateway';
import { SessionEndValidatorService } from './session-end-validator.service';

@Injectable()
export class TaskExpiryValidatorService {
    private readonly logger = new Logger(TaskExpiryValidatorService.name);

    constructor(
        @InjectRepository(ParticipantTaskEntity)
        private participantTaskRepository: Repository<ParticipantTaskEntity>,
        @InjectRepository(QuestTaskEntity)
        private questTaskRepository: Repository<QuestTaskEntity>,
        @InjectRepository(ParticipantEntity)
        private participantRepository: Repository<ParticipantEntity>,
        @InjectRepository(ParticipantTaskQuizAnswerEntity)
        private participantTaskQuizAnswerRepository: Repository<ParticipantTaskQuizAnswerEntity>,
        private activeSessionGateway: ActiveSessionGateway,
        @Inject(forwardRef(() => SessionEndValidatorService))
        private sessionEndValidatorService: SessionEndValidatorService,
    ) {}

    @Cron(CronExpression.EVERY_30_SECONDS)
    async validateExpiredTasks() {
        try {
            const expiredTasks = await this.participantTaskRepository
                .createQueryBuilder('pt')
                .leftJoinAndSelect('pt.task', 'task')
                .leftJoinAndSelect('pt.participant', 'participant')
                .leftJoinAndSelect('participant.user', 'user')
                .leftJoinAndSelect('participant.session', 'session')
                .leftJoinAndSelect('session.quest', 'quest')
                .leftJoinAndSelect('quest.organizer', 'organizer')
                .leftJoinAndSelect('task.point', 'point')
                .where('pt.startDate IS NOT NULL')
                .andWhere('pt.completedDate IS NULL')
                .andWhere('session.endReason IS NULL')
                .getMany();

            if (expiredTasks.length === 0) {
                return;
            }

            const now = new Date();

            for (const participantTask of expiredTasks) {
                const expiryTime = new Date(
                    participantTask.startDate.getTime() + participantTask.task.maxDurationSeconds * 1000
                );

                if (now > expiryTime) {
                    await this.handleExpiredTask(participantTask, now);
                }
            }
        } catch (error) {
            this.logger.error(`Error in validateExpiredTasks: ${error.message}`, error.stack);
        }
    }

    private async handleExpiredTask(participantTask: ParticipantTaskEntity, now: Date) {
        try {
            const task = participantTask.task;
            const participant = participantTask.participant;

            this.logger.log(
                `Handling expired task ${task.questTaskId} (type: ${task.taskType}) for user ${participant.user.userId}`
            );

            if (task.taskType === QuestTaskType.QUIZ) {
                await this.autoCompleteQuizTask(participantTask, task, now);
            } else {
                await this.participantTaskRepository.update(
                    { participantTaskId: participantTask.participantTaskId },
                    {
                        scoreEarned: 0,
                        completedDate: now,
                    }
                );

                this.logger.log(
                    `Auto-completed expired ${task.taskType} task ${task.questTaskId} with 0 score`
                );
            }

            if (task.isRequiredForNextPoint) {
                const updatedTask = await this.participantTaskRepository.findOne({
                    where: { participantTaskId: participantTask.participantTaskId },
                });

                const scorePercentage = (updatedTask.scoreEarned / task.maxScorePointsCount) * 100;

                if (scorePercentage < task.successScorePointsPercent) {
                    participant.participationStatus = ParticipantStatus.DISQUALIFIED;
                    participant.rejectionReason = RejectionReason.REQUIRED_TASK_NOT_COMPLETED;
                    await this.participantRepository.save(participant);

                    await this.activeSessionGateway.notifyParticipantDisqualified(
                        participant.session.questSessionId,
                        participant.session.quest.organizer.userId,
                        participant
                    );

                    this.logger.log(
                        `Disqualified user ${participant.user.userId} - required task expired with insufficient score (${scorePercentage.toFixed(1)}% < ${task.successScorePointsPercent}%)`
                    );
                }
            }

            await this.sessionEndValidatorService.checkSessionCompletion(participant.session.questSessionId);
        } catch (error) {
            this.logger.error(
                `Failed to handle expired task ${participantTask.participantTaskId}: ${error.message}`,
                error.stack
            );
        }
    }

    private async autoCompleteQuizTask(
        participantTask: ParticipantTaskEntity,
        task: QuestTaskEntity,
        completedDate: Date
    ) {
        try {
            const participantAnswers = await this.participantTaskQuizAnswerRepository.find({
                where: {
                    participantTask: { participantTaskId: participantTask.participantTaskId },
                },
                relations: ['answer', 'answer.question'],
            });

            let scoreEarned = 0;

            const taskWithQuestions = await this.questTaskRepository.findOne({
                where: { questTaskId: task.questTaskId },
                relations: ['quizQuestions', 'quizQuestions.answers'],
            });

            for (const participantAnswer of participantAnswers) {
                if (participantAnswer.answer.isCorrect) {
                    const quizQuestion = taskWithQuestions.quizQuestions.find(
                        q => q.quizQuestionId === participantAnswer.answer.question.quizQuestionId
                    );
                    if (quizQuestion) {
                        scoreEarned += quizQuestion.scorePointsCount;
                    }
                }
            }

            await this.participantTaskRepository.update(
                { participantTaskId: participantTask.participantTaskId },
                {
                    scoreEarned: scoreEarned,
                    completedDate: completedDate,
                }
            );

            this.logger.log(
                `Auto-completed expired quiz task ${task.questTaskId} with partial score: ${scoreEarned}/${task.maxScorePointsCount}`
            );

            await this.sendTaskCompletionNotifications(
                participantTask.participant.session.questSessionId,
                participantTask.participant.user.userId,
                participantTask.participant.user.name,
                task.questTaskId,
                task.point.name,
                scoreEarned,
                completedDate
            );
        } catch (error) {
            this.logger.error(
                `Failed to auto-complete quiz task ${participantTask.participantTaskId}: ${error.message}`,
                error.stack
            );
        }
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
            const participant = await this.participantRepository.findOne({
                where: { user: { userId }, session: { questSessionId: sessionId } },
                relations: ['tasks', 'session', 'session.quest', 'session.quest.organizer'],
            });

            if (!participant) {
                return;
            }

            const totalScore =
                participant.tasks
                    ?.filter(t => t.completedDate !== null)
                    .reduce((sum, t) => sum + (t.scoreEarned || 0), 0) || 0;

            const organizerUserId = participant.session.quest.organizer.userId;

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
            }
        } catch (error) {
            this.logger.error(
                `Error sending task completion notifications: ${error.message}`,
                error.stack
            );
        }
    }
}