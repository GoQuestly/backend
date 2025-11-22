import { ApiProperty } from "@nestjs/swagger";
import { ParticipantStatus } from "@/common/enums/participant-status";

export class ParticipantValidationDto {
    @ApiProperty({
        example: 1
    })
    participantId: number;

    @ApiProperty({
        example: 1
    })
    userId: number;

    @ApiProperty({
        example: 'John Doe'
    })
    userName: string;

    @ApiProperty({
        enum: ParticipantStatus,
        example: ParticipantStatus.APPROVED
    })
    status: ParticipantStatus;

    @ApiProperty({
        example: 'Too far: 1500m',
        required: false
    })
    reason?: string;
}