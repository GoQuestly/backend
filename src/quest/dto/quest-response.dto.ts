import {ApiProperty} from '@nestjs/swagger';

export class QuestResponseDto {
    @ApiProperty({example: 1})
    questId: number;

    @ApiProperty({example: 'The Lost Treasure of Verde Island'})
    title: string;

    @ApiProperty({example: 'A brief, engaging summary of the quest\'s story.'})
    description: string;

    @ApiProperty({example: '2025-10-19T18:00:00.000Z'})
    creationDate: Date;

    @ApiProperty({example: '2025-10-19T18:00:00.000Z'})
    updateDate: Date;

    @ApiProperty({example: 40.7128})
    startingLatitude: number;

    @ApiProperty({example: -74.0060})
    startingLongitude: number;

    @ApiProperty({example: 50})
    startingRadiusMeters: number;

    @ApiProperty({example: 120})
    maxDurationMinutes: number;

    @ApiProperty({example: '/uploads/quests/1729356000000-123456789.jpg'})
    photoUrl: string;

    @ApiProperty({example: 1})
    minParticipantCount: number;

    @ApiProperty({example: 50})
    maxParticipantCount: number;

    @ApiProperty({example: 1})
    organizerId: number;
}