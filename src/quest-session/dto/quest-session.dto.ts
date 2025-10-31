import {IsDateString, IsInt, IsOptional, IsString, Max, Min} from 'class-validator';
import {ApiProperty} from '@nestjs/swagger';
import {QuestSessionEndReason} from '@/common/enums/QuestSessionEndReason';
import {Type} from 'class-transformer';

export class QuestSessionDto {
    @ApiProperty({ example: '2025-11-01T10:00:00Z', description: 'Session start date' })
    @IsDateString()
    startDate: string;
}

export class JoinSessionDto {
    @ApiProperty({ example: 'abc123xyz456def789', description: 'Invite token for the session' })
    @IsString()
    inviteToken: string;
}

export class GetQuestSessionsQueryDto {
    @ApiProperty({ example: 1, required: false, minimum: 1, description: 'Page number' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    pageNumber?: number = 1;

    @ApiProperty({ example: 10, required: false, minimum: 1, maximum: 100, description: 'Items per page' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    pageSize?: number = 10;
}

export class GetMySessionsQueryDto {
    @ApiProperty({ example: 10, required: false, minimum: 1, maximum: 100, description: 'Maximum number of items to return' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number = 10;

    @ApiProperty({ example: 0, required: false, minimum: 0, description: 'Number of items to skip' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    offset?: number = 0;
}

export class ParticipantResponseDto {
    @ApiProperty({ example: 1 })
    participantId: number;

    @ApiProperty({ example: 1 })
    userId: number;

    @ApiProperty({ example: 'john_doe', required: false })
    userName?: string;

    @ApiProperty({ example: '2025-11-01T10:15:00Z' })
    joinedAt: Date;
}

export class QuestSessionResponseDto {
    @ApiProperty({ example: 1 })
    questSessionId: number;

    @ApiProperty({ example: 1 })
    questId: number;

    @ApiProperty({ example: 'City Adventure Quest', required: false })
    questTitle?: string;

    @ApiProperty({ example: '2025-11-01T10:00:00Z' })
    startDate: Date;

    @ApiProperty({ example: '2025-11-01T12:00:00Z', nullable: true })
    endDate: Date;

    @ApiProperty({ enum: QuestSessionEndReason, required: false, example: null })
    endReason?: QuestSessionEndReason;

    @ApiProperty({ example: 'abc123xyz456def789' })
    inviteToken: string;

    @ApiProperty({ type: [ParticipantResponseDto] })
    participants: ParticipantResponseDto[];

    @ApiProperty({ example: true })
    isActive: boolean;

    @ApiProperty({ example: 5 })
    participantCount: number;
}

export class QuestSessionListResponseDto {
    @ApiProperty({ example: 1 })
    questSessionId: number;

    @ApiProperty({ example: 1 })
    questId: number;

    @ApiProperty({ example: 'City Adventure Quest', required: false })
    questTitle?: string;

    @ApiProperty({ example: '2025-11-01T10:00:00Z' })
    startDate: Date;

    @ApiProperty({ example: '2025-11-01T12:00:00Z', nullable: true })
    endDate: Date;

    @ApiProperty({ example: true })
    isActive: boolean;

    @ApiProperty({ example: 5 })
    participantCount: number;
}

export class PaginatedQuestSessionsResponseDto {
    @ApiProperty({ type: [QuestSessionListResponseDto], description: 'List of quest sessions' })
    items: QuestSessionListResponseDto[];

    @ApiProperty({ example: 25, description: 'Total number of sessions' })
    total: number;

    @ApiProperty({ example: 1, description: 'Current page number' })
    pageNumber: number;

    @ApiProperty({ example: 10, description: 'Number of items per page' })
    pageSize: number;
}

export class PaginatedMySessionsResponseDto {
    @ApiProperty({ type: [QuestSessionListResponseDto], description: 'List of quest sessions' })
    items: QuestSessionListResponseDto[];

    @ApiProperty({ example: 25, description: 'Total number of sessions' })
    total: number;

    @ApiProperty({ example: 10, description: 'Maximum number of items returned' })
    limit: number;

    @ApiProperty({ example: 0, description: 'Number of items skipped' })
    offset: number;
}