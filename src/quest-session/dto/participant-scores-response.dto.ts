import {ApiProperty} from "@nestjs/swagger";

export class ParticipantScoreDto {
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
        example: 'john_doe',
        description: 'Username',
        nullable: true
    })
    userName: string | null;

    @ApiProperty({
        example: '/uploads/users/photo.jpg',
        description: 'User photo URL',
        nullable: true
    })
    photoUrl: string | null;

    @ApiProperty({
        example: 150,
        description: 'Total score earned by the participant'
    })
    totalScore: number;

    @ApiProperty({
        example: 5,
        description: 'Number of completed tasks'
    })
    completedTasksCount: number;
}

export class ParticipantScoresResponseDto {
    @ApiProperty({
        type: [ParticipantScoreDto],
        description: 'List of participants with their scores'
    })
    participants: ParticipantScoreDto[];

    @ApiProperty({
        example: 10,
        description: 'Total number of tasks in the quest'
    })
    totalTasksInQuest: number;
}
