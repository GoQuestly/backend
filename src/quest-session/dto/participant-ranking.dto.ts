import {ApiProperty} from "@nestjs/swagger";

export class ParticipantRankingDto {
    @ApiProperty({
        example: 1,
        description: 'Rank position'
    })
    rank: number;

    @ApiProperty({
        example: 1,
        description: 'Participant ID'
    })
    participantId: number;

    @ApiProperty({
        example: 1,
        description: 'User ID'
    })
    userId: number;

    @ApiProperty({
        example: 'John Doe',
        description: 'User name'
    })
    userName: string;

    @ApiProperty({
        example: '/uploads/users/photo.jpg',
        description: 'User photo URL',
        nullable: true
    })
    photoUrl: string | null;

    @ApiProperty({
        example: 150,
        description: 'Total score earned'
    })
    totalScore: number;

    @ApiProperty({
        example: 5,
        description: 'Number of checkpoints passed'
    })
    passedCheckpointsCount: number;

    @ApiProperty({
        example: '2024-01-01T12:30:00Z',
        description: 'Time when participant finished the quest',
        nullable: true
    })
    finishDate: Date | null;

    @ApiProperty({
        example: 7200,
        description: 'Completion time in seconds',
        nullable: true
    })
    completionTimeSeconds: number | null;
}