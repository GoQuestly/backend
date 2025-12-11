import {ApiProperty} from "@nestjs/swagger";

export class SessionStatisticsDto {
    @ApiProperty({
        example: 7200,
        description: 'Session duration in seconds'
    })
    sessionDurationSeconds: number;

    @ApiProperty({
        example: 15,
        description: 'Total number of participants'
    })
    totalParticipantsCount: number;

    @ApiProperty({
        example: 10,
        description: 'Number of participants who finished the quest'
    })
    finishedParticipantsCount: number;

    @ApiProperty({
        example: 3,
        description: 'Number of rejected participants'
    })
    rejectedParticipantsCount: number;

    @ApiProperty({
        example: 2,
        description: 'Number of disqualified participants'
    })
    disqualifiedParticipantsCount: number;
}