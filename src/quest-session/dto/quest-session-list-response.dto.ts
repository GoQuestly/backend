import { ApiProperty } from "@nestjs/swagger";

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
        example: true
    })
    isActive: boolean;

    @ApiProperty({
        example: 5
    })
    participantCount: number;
}