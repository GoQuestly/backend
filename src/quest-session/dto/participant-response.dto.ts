import { ApiProperty } from "@nestjs/swagger";
import { ParticipantStatus } from "@/common/enums/participant-status";
import { RejectionReason } from "@/common/enums/rejection-reason";

export class ParticipantResponseDto {
    @ApiProperty({
        example: 1
    })
    participantId: number;

    @ApiProperty({
        example: 1
    })
    userId: number;

    @ApiProperty({
        example: 'john_doe',
        required: false
    })
    userName?: string;

    @ApiProperty({
        example: '/uploads/users/photo.jpg',
        nullable: true,
        required: false
    })
    photoUrl?: string;

    @ApiProperty({
        example: '2025-11-01T10:15:00Z'
    })
    joinedAt: Date;

    @ApiProperty({
        enum: ParticipantStatus,
        example: ParticipantStatus.PENDING
    })
    participationStatus: ParticipantStatus;

    @ApiProperty({
        enum: RejectionReason,
        example: RejectionReason.TOO_FAR_FROM_START,
        nullable: true,
        required: false
    })
    rejectionReason?: RejectionReason;

    @ApiProperty({
        example: 3,
        required: false
    })
    passedQuestPointCount?: number;
}