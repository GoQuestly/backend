import {BadRequestException, Inject, Injectable, NotFoundException, UnauthorizedException} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {Repository} from 'typeorm';
import * as bcrypt from 'bcrypt';
import {JwtService} from '@nestjs/jwt';
import {AdminEntity} from '@/common/entities/admin.entity';
import {UserEntity} from '@/common/entities/user.entity';
import {QuestEntity} from '@/common/entities/quest.entity';
import {QuestSessionEntity} from '@/common/entities/quest-session.entity';
import {ParticipantEntity} from '@/common/entities/participant.entity';
import {AdminLoginDto} from './dto/admin-login.dto';
import {AdminLoginResponseDto} from './dto/admin-login-response.dto';
import {GetUsersQueryDto, UserSortBy} from './dto/get-users-query.dto';
import {PaginatedUsersResponseDto} from './dto/paginated-users-response.dto';
import {UserWithStatsDto} from './dto/user-with-stats.dto';
import {BanUserDto} from './dto/ban-user.dto';
import {UnbanUserDto} from './dto/unban-user.dto';
import {GetStatisticsQueryDto, StatisticsPeriod} from './dto/get-statistics-query.dto';
import {StatisticsResponseDto} from './dto/statistics-response.dto';
import {QuestSessionEndReason} from '@/common/enums/quest-session-end-reason';
import {getAbsoluteUrl} from '@/common/utils/url.util';
import {REQUEST} from '@nestjs/core';
import {Request} from 'express';

@Injectable()
export class AdminService {
    constructor(
        @InjectRepository(AdminEntity)
        private readonly adminRepo: Repository<AdminEntity>,
        @InjectRepository(UserEntity)
        private readonly userRepo: Repository<UserEntity>,
        @InjectRepository(QuestEntity)
        private readonly questRepo: Repository<QuestEntity>,
        @InjectRepository(QuestSessionEntity)
        private readonly sessionRepo: Repository<QuestSessionEntity>,
        @InjectRepository(ParticipantEntity)
        private readonly participantRepo: Repository<ParticipantEntity>,
        private readonly jwtService: JwtService,
        @Inject(REQUEST) private readonly request: Request,
    ) {
    }

    async login(dto: AdminLoginDto): Promise<AdminLoginResponseDto> {
        const admin = await this.adminRepo.findOne({
            where: {email: dto.email}
        });

        if (!admin) {
            throw new UnauthorizedException('Invalid email or password');
        }

        const isMatch = await bcrypt.compare(dto.password, admin.password);
        if (!isMatch) {
            throw new UnauthorizedException('Invalid email or password');
        }

        const payload = {
            sub: admin.adminId,
            email: admin.email
        };
        const accessToken = this.jwtService.sign(payload);

        return {
            access_token: accessToken,
            email: admin.email,
            adminId: admin.adminId,
        };
    }

    async getUsers(query: GetUsersQueryDto): Promise<PaginatedUsersResponseDto> {
        const {
            pageNumber = 1,
            pageSize = 10,
            search,
            sortBy = UserSortBy.REGISTRATION,
            sortOrder = 'DESC'
        } = query;

        const userIdsQb = this.userRepo.createQueryBuilder('user')
            .select('user.userId', 'userId');

        if (search && search.trim().length > 0) {
            const searchPattern = `%${search.trim()}%`;
            userIdsQb.andWhere(
                '(user.email ILIKE :search OR user.name ILIKE :search)',
                {search: searchPattern}
            );
        }

        if (sortBy === UserSortBy.NAME) {
            userIdsQb.orderBy('user.name', sortOrder);
        } else {
            userIdsQb.orderBy('user.userId', sortOrder);
        }

        const total = await userIdsQb.getCount();

        userIdsQb.skip((pageNumber - 1) * pageSize)
            .take(pageSize);

        const userIdsResult = await userIdsQb.getRawMany();
        const userIds = userIdsResult.map(row => row.userId);

        if (userIds.length === 0) {
            return {
                items: [],
                total,
                pageNumber,
                pageSize,
            };
        }

        const usersQb = this.userRepo.createQueryBuilder('user')
            .leftJoin('user.quests', 'quest')
            .leftJoin('user.participations', 'participation')
            .select('user.userId', 'userId')
            .addSelect('user.email', 'email')
            .addSelect('user.name', 'name')
            .addSelect('user.photoUrl', 'photoUrl')
            .addSelect('user.isEmailVerified', 'isEmailVerified')
            .addSelect('user.isBanned', 'isBanned')
            .addSelect('COUNT(DISTINCT quest.questId)', 'questCount')
            .addSelect('COUNT(DISTINCT participation.participantId)', 'sessionCount')
            .where('user.userId IN (:...userIds)', {userIds})
            .groupBy('user.userId')
            .addGroupBy('user.email')
            .addGroupBy('user.name')
            .addGroupBy('user.photoUrl')
            .addGroupBy('user.isEmailVerified')
            .addGroupBy('user.isBanned');

        if (sortBy === UserSortBy.NAME) {
            usersQb.orderBy('user.name', sortOrder);
        } else {
            usersQb.orderBy('user.userId', sortOrder);
        }

        const rawResults = await usersQb.getRawMany();

        const items: UserWithStatsDto[] = rawResults.map(row => ({
            userId: row.userId,
            email: row.email,
            name: row.name,
            photoUrl: getAbsoluteUrl(this.request, row.photoUrl),
            isEmailVerified: row.isEmailVerified,
            isBanned: row.isBanned,
            questCount: parseInt(row.questCount, 10) || 0,
            sessionCount: parseInt(row.sessionCount, 10) || 0,
        }));

        return {
            items,
            total,
            pageNumber,
            pageSize,
        };
    }

    async banUser(dto: BanUserDto): Promise<void> {
        const user = await this.userRepo.findOne({
            where: { userId: dto.userId }
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        if (user.isBanned) {
            throw new BadRequestException('User is already banned');
        }

        user.isBanned = true;
        await this.userRepo.save(user);
    }

    async unbanUser(dto: UnbanUserDto): Promise<void> {
        const user = await this.userRepo.findOne({
            where: { userId: dto.userId }
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        if (!user.isBanned) {
            throw new BadRequestException('User is not banned');
        }

        user.isBanned = false;
        await this.userRepo.save(user);
    }

    async getStatistics(query: GetStatisticsQueryDto): Promise<StatisticsResponseDto> {
        const {period = StatisticsPeriod.MONTH} = query;
        const {startDate, endDate, prevStartDate, prevEndDate} = this.getPeriodDates(period);

        const totalUsers = await this.userRepo.count();

        const newUsersResult = await this.participantRepo
            .createQueryBuilder('participant')
            .select('COUNT(DISTINCT participant.user_user_id)', 'count')
            .where('participant.created_at >= :startDate', {startDate})
            .andWhere('participant.created_at <= :endDate', {endDate})
            .getRawOne();
        const newUsers = parseInt(newUsersResult?.count || '0', 10);

        const activeUsersResult = await this.participantRepo
            .createQueryBuilder('participant')
            .select('COUNT(DISTINCT participant.user_user_id)', 'count')
            .where('participant.created_at >= :startDate', {startDate})
            .andWhere('participant.created_at <= :endDate', {endDate})
            .getRawOne();
        const activeUsers = parseInt(activeUsersResult?.count || '0', 10);

        const totalQuests = await this.questRepo.count();

        const totalSessions = await this.sessionRepo
            .createQueryBuilder('session')
            .where('session.start_date >= :startDate', {startDate})
            .andWhere('session.start_date <= :endDate', {endDate})
            .getCount();

        const completedSessions = await this.sessionRepo
            .createQueryBuilder('session')
            .where('session.start_date >= :startDate', {startDate})
            .andWhere('session.start_date <= :endDate', {endDate})
            .andWhere('session.end_date IS NOT NULL')
            .andWhere('session.end_reason = :endReason', {endReason: QuestSessionEndReason.FINISHED})
            .getCount();

        const completionRate = totalSessions > 0
            ? parseFloat(((completedSessions / totalSessions) * 100).toFixed(1))
            : 0;

        const activeSessions = await this.sessionRepo
            .createQueryBuilder('session')
            .where('session.end_date IS NULL')
            .getCount();

        const prevActiveUsersResult = await this.participantRepo
            .createQueryBuilder('participant')
            .select('COUNT(DISTINCT participant.user_user_id)', 'count')
            .where('participant.created_at >= :prevStartDate', {prevStartDate})
            .andWhere('participant.created_at <= :prevEndDate', {prevEndDate})
            .getRawOne();
        const prevActiveUsers = parseInt(prevActiveUsersResult?.count || '0', 10);

        const userGrowth = prevActiveUsers > 0
            ? parseFloat((((activeUsers - prevActiveUsers) / prevActiveUsers) * 100).toFixed(1))
            : 0;

        return {
            period: {
                type: period,
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
            },
            metrics: {
                totalUsers,
                newUsers,
                activeUsers,
                totalQuests,
                totalSessions,
                completedSessions,
                completionRate,
                activeSessions,
                userGrowth,
            },
        };
    }

    private getPeriodDates(period: StatisticsPeriod): {
        startDate: Date;
        endDate: Date;
        prevStartDate: Date;
        prevEndDate: Date
    } {
        const now = new Date();
        const endDate = new Date(now);
        let startDate = new Date(now);
        let prevStartDate = new Date(now);
        let prevEndDate = new Date(now);

        switch (period) {
            case StatisticsPeriod.DAY:
                startDate.setDate(now.getDate() - 1);
                prevEndDate = new Date(startDate);
                prevStartDate.setDate(startDate.getDate() - 1);
                break;
            case StatisticsPeriod.WEEK:
                startDate.setDate(now.getDate() - 7);
                prevEndDate = new Date(startDate);
                prevStartDate.setDate(startDate.getDate() - 7);
                break;
            case StatisticsPeriod.MONTH:
                startDate.setMonth(now.getMonth() - 1);
                prevEndDate = new Date(startDate);
                prevStartDate.setMonth(startDate.getMonth() - 1);
                break;
            case StatisticsPeriod.YEAR:
                startDate.setFullYear(now.getFullYear() - 1);
                prevEndDate = new Date(startDate);
                prevStartDate.setFullYear(startDate.getFullYear() - 1);
                break;
            case StatisticsPeriod.ALL_TIME:
                startDate = new Date(0);
                prevStartDate = new Date(0);
                prevEndDate = new Date(0);
                break;
        }

        return {startDate, endDate, prevStartDate, prevEndDate};
    }
}
