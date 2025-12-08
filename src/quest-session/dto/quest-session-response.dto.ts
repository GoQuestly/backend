import { ApiProperty } from "@nestjs/swagger";
import { QuestSessionEndReason } from "@/common/enums/quest-session-end-reason";
import { ParticipantResponseDto } from "@/quest-session/dto/participant-response.dto";

export class QuestSessionResponseDto {
    @ApiProperty({
        example: 1
    })
    questSessionId: number;

    @ApiProperty({
        example: 1
    })
    questId: number;

    @ApiProperty({
        example: 'City Adventure Quest', required: false
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
        example: 'abc123xyz456def789'
    })
    inviteToken: string;

    @ApiProperty({
        type: [ParticipantResponseDto]
    })
    participants: ParticipantResponseDto[];

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
        example: '/uploads/quests/photo.jpg',
        nullable: true
    })
    questPhotoUrl: string | null;

    @ApiProperty({
        example: 'Explore the historic downtown area'
    })
    questDescription: string;

    @ApiProperty({
        example: 120
    })
    questMaxDurationMinutes: number;

    @ApiProperty({
        example: 'Starting Point Plaza'
    })
    startPointName: string;
}