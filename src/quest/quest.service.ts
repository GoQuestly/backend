import { Injectable, BadRequestException, NotFoundException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuestEntity } from '@/common/entities/quest.entity';
import { UserEntity } from '@/common/entities/user.entity';
import { CreateQuestDto } from './dto/create-quest.dto';
import { UpdateQuestDto } from './dto/update-quest.dto';
import { QuestResponseDto } from './dto/quest-response.dto';
import * as fs from 'fs';
import * as path from 'path';
import { getAbsoluteUrl } from '@/common/utils/url.util';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { QuestSessionService } from "@/quest-session/quest-session.service";

@Injectable()
export class QuestService {
    constructor(
        @InjectRepository(QuestEntity)
        private questRepository: Repository<QuestEntity>,
        @InjectRepository(UserEntity)
        private userRepository: Repository<UserEntity>,
        @Inject(REQUEST) private readonly request: Request,
        private questSessionService: QuestSessionService,
    ) {
    }

    async createQuest(
        userId: number,
        createQuestDto: CreateQuestDto,
    ): Promise<QuestResponseDto> {
        const user = await this.userRepository.findOne({
            where: {userId},
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        this.validateParticipantCounts(createQuestDto.minParticipantCount, createQuestDto.maxParticipantCount);

        const quest = this.questRepository.create({
            title: createQuestDto.title,
            description: createQuestDto.description || '',
            startingLatitude: createQuestDto.startingLatitude,
            startingLongitude: createQuestDto.startingLongitude,
            startingRadiusMeters: createQuestDto.startingRadiusMeters,
            maxDurationMinutes: createQuestDto.maxDurationMinutes,
            minParticipantCount: createQuestDto.minParticipantCount,
            maxParticipantCount: createQuestDto.maxParticipantCount,
            photoUrl: '',
            organizer: user,
        });

        const savedQuest = await this.questRepository.save(quest);

        return this.mapQuestToResponse(savedQuest);
    }

    async getOrganizerQuest(questId: number, userId: number): Promise<QuestResponseDto> {
        const quest = await this.findQuestWithOrganizer(questId);
        this.verifyQuestOwnership(quest, userId);
        return this.mapQuestToResponse(quest);
    }

    async getUserQuests(
        userId: number,
        pageNumber = 1,
        pageSize = 10,
        search?: string,
    ): Promise<{ items: QuestResponseDto[]; total: number; pageNumber: number; pageSize: number }> {
        const qb = this.questRepository.createQueryBuilder('quest')
            .leftJoinAndSelect('quest.organizer', 'organizer')
            .where('organizer.userId = :userId', {userId});

        if (search && search.trim().length > 0) {
            const q = `%${search.trim()}%`;
            qb.andWhere('(quest.title ILIKE :q OR quest.description ILIKE :q)', {q});
        }

        qb.orderBy('quest.updateDate', 'DESC')
            .addOrderBy('quest.creationDate', 'DESC')
            .skip((pageNumber - 1) * pageSize)
            .take(pageSize);

        const [entities, total] = await qb.getManyAndCount();

        const items = entities.map((quest) => this.mapQuestToResponse(quest));

        return {
            items,
            total,
            pageNumber,
            pageSize,
        };
    }

    async updateQuest(
        questId: number,
        userId: number,
        updateQuestDto: UpdateQuestDto,
    ): Promise<QuestResponseDto> {
        const quest = await this.findQuestWithOrganizer(questId);
        this.verifyQuestOwnership(quest, userId);

        await this.questSessionService.checkActiveSession(questId);

        Object.assign(quest, this.filterDefinedProperties(updateQuestDto));

        this.validateParticipantCounts(quest.minParticipantCount, quest.maxParticipantCount);

        const updatedQuest = await this.questRepository.save(quest);
        return this.mapQuestToResponse(updatedQuest);
    }

    async deleteQuest(questId: number, userId: number): Promise<void> {
        const quest = await this.findQuestWithOrganizer(questId);
        this.verifyQuestOwnership(quest, userId);

        this.deleteCoverImageFile(quest.photoUrl);

        await this.questRepository.remove(quest);
    }

    async uploadCoverImage(
        questId: number,
        userId: number,
        photoFilename: string,
    ): Promise<QuestResponseDto> {
        const quest = await this.findQuestWithOrganizer(questId);
        this.verifyQuestOwnership(quest, userId);

        this.deleteCoverImageFile(quest.photoUrl);

        quest.photoUrl = `/uploads/quests/${photoFilename}`;
        const updatedQuest = await this.questRepository.save(quest);

        return this.mapQuestToResponse(updatedQuest);
    }

    private async findQuestWithOrganizer(questId: number): Promise<QuestEntity> {
        const quest = await this.questRepository.findOne({
            where: {questId},
            relations: ['organizer'],
        });

        if (!quest) {
            throw new NotFoundException('Quest not found');
        }

        return quest;
    }

    private verifyQuestOwnership(quest: QuestEntity, userId: number): void {
        if (quest.organizer.userId !== userId) {
            throw new BadRequestException('You are not the organizer of this quest');
        }
    }

    private validateParticipantCounts(minCount: number, maxCount: number): void {
        if (minCount > maxCount) {
            throw new BadRequestException('Min participants cannot be greater than max participants');
        }
    }

    private filterDefinedProperties(dto: UpdateQuestDto): Partial<QuestEntity> {
        const updates: Partial<QuestEntity> = {};

        if (dto.title !== undefined) updates.title = dto.title;
        if (dto.description !== undefined) updates.description = dto.description;
        if (dto.startingLatitude !== undefined) updates.startingLatitude = dto.startingLatitude;
        if (dto.startingLongitude !== undefined) updates.startingLongitude = dto.startingLongitude;
        if (dto.startingRadiusMeters !== undefined) updates.startingRadiusMeters = dto.startingRadiusMeters;
        if (dto.maxDurationMinutes !== undefined) updates.maxDurationMinutes = dto.maxDurationMinutes;
        if (dto.minParticipantCount !== undefined) updates.minParticipantCount = dto.minParticipantCount;
        if (dto.maxParticipantCount !== undefined) updates.maxParticipantCount = dto.maxParticipantCount;

        return updates;
    }

    private deleteCoverImageFile(photoUrl: string | null): void {
        if (!photoUrl) return;

        try {
            const filename = photoUrl.replace(`/uploads/quests/`, '');
            const filePath = path.join(process.cwd(), 'uploads', 'quests', filename);

            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        } catch (error) {
            console.error('Error deleting cover image:', error);
        }
    }

    private mapQuestToResponse(quest: QuestEntity): QuestResponseDto {
        return {
            questId: quest.questId,
            title: quest.title,
            description: quest.description,
            creationDate: quest.creationDate,
            updateDate: quest.updateDate,
            startingLatitude: quest.startingLatitude,
            startingLongitude: quest.startingLongitude,
            startingRadiusMeters: quest.startingRadiusMeters,
            maxDurationMinutes: quest.maxDurationMinutes,
            photoUrl: getAbsoluteUrl(this.request, quest.photoUrl),
            minParticipantCount: quest.minParticipantCount,
            maxParticipantCount: quest.maxParticipantCount,
            organizerId: quest.organizer?.userId,
        };
    }
}