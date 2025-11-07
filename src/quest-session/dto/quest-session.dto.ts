import { IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class QuestSessionDto {
    @ApiProperty({
        example: '2025-11-01T10:00:00Z',
        description: 'Session start date and time'
    })
    @IsDateString()
    startDate: string;
}