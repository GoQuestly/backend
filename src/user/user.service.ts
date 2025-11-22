import {Injectable, NotFoundException, BadRequestException, Inject} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {Repository} from 'typeorm';
import {UserEntity} from '@/common/entities/user.entity';
import {UpdateProfileDto} from './dto/update-profile.dto';
import {UserDto} from "@/common/dto/user.dto";
import {REQUEST} from '@nestjs/core';
import {Request} from 'express';
import {getAbsoluteUrl} from '@/common/utils/url.util';

@Injectable()
export class UserService {
    constructor(
        @InjectRepository(UserEntity)
        private readonly userRepository: Repository<UserEntity>,
        @Inject(REQUEST) private readonly request: Request,
    ) {
    }

    async getProfile(userId: number): Promise<UserDto> {
        const user = await this.userRepository.findOne({
            where: {userId},
            select: ['userId', 'email', 'name', 'photoUrl', 'isEmailVerified'],
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        return {
            userId: user.userId,
            email: user.email,
            name: user.name,
            photoUrl: getAbsoluteUrl(this.request, user.photoUrl),
            isEmailVerified: user.isEmailVerified,
        };
    }

    async updateProfile(
        userId: number,
        updateProfileDto: UpdateProfileDto,
    ): Promise<UserDto> {
        const user = await this.userRepository.findOne({
            where: {userId},
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        if (updateProfileDto.name !== undefined) {
            user.name = updateProfileDto.name;
        }

        const updatedUser = await this.userRepository.save(user);

        return {
            userId: updatedUser.userId,
            email: updatedUser.email,
            name: updatedUser.name,
            photoUrl: getAbsoluteUrl(this.request, updatedUser.photoUrl),
            isEmailVerified: updatedUser.isEmailVerified,
        };
    }

    async updateUserAvatar(userId: number, filename: string) {
        const user = await this.userRepository.findOne({
            where: {userId},
        });

        if (!user) {
            throw new BadRequestException('User not found');
        }

        user.photoUrl = `/uploads/avatars/${filename}`;
        await this.userRepository.save(user);

        return {
            message: 'Avatar updated successfully',
            photoUrl: getAbsoluteUrl(this.request, user.photoUrl),
        };
    }
}