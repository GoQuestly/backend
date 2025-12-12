import {Inject, Injectable, UnauthorizedException} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {Repository} from 'typeorm';
import * as bcrypt from 'bcrypt';
import {JwtService} from '@nestjs/jwt';
import {AdminEntity} from '@/common/entities/admin.entity';
import {UserEntity} from '@/common/entities/user.entity';
import {AdminLoginDto} from './dto/admin-login.dto';
import {AdminLoginResponseDto} from './dto/admin-login-response.dto';
import {GetUsersQueryDto, UserSortBy} from './dto/get-users-query.dto';
import {PaginatedUsersResponseDto} from './dto/paginated-users-response.dto';
import {UserWithStatsDto} from './dto/user-with-stats.dto';
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
            .addSelect('COUNT(DISTINCT quest.questId)', 'questCount')
            .addSelect('COUNT(DISTINCT participation.participantId)', 'sessionCount')
            .where('user.userId IN (:...userIds)', {userIds})
            .groupBy('user.userId')
            .addGroupBy('user.email')
            .addGroupBy('user.name')
            .addGroupBy('user.photoUrl')
            .addGroupBy('user.isEmailVerified');

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
}
