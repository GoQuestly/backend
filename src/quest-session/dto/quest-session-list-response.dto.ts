import { ApiProperty } from "@nestjs/swagger";
import { QuestSessionEndReason } from "@/common/enums/quest-session-end-reason";

export class QuestSessionListResponseDto {
    @ApiProperty({
        example: 1
    })
    questSessionId: number;

    @ApiProperty({
        example: 1
    })
    questId: number;

    @ApiProperty({
        example: 'City Adventure Quest',
        required: false
    })
    questTitle?: string;

    @ApiProperty({
        example: '2025-11-01T10:00:00Z'
    })
    startDate: Date;

    @ApiProperty({
        example: '2025-11-01T12:00:00Z',
        nullable: true
    })
    endDate: Date;

    @ApiProperty({
        enum: QuestSessionEndReason,
        required: false,
        example: null
    })
    endReason?: QuestSessionEndReason;

    @ApiProperty({
        example: true
    })
    isActive: boolean;

    @ApiProperty({
        example: 5
    })
    participantCount: number;

    @ApiProperty({
        example: 10
    })
    questPointCount: number;

    @ApiProperty({
        example: 3
    })
    passedQuestPointCount: number;
}