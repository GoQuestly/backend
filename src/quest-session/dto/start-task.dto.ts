import { ApiProperty } from '@nestjs/swagger';

export class StartTaskResponseDto {
    @ApiProperty({ example: 1 })
    participantTaskId: number;

    @ApiProperty({ example: 1 })
    questPointId: number;

    @ApiProperty({ example: '2024-01-15T10:30:00Z' })
    startDate: Date;

    @ApiProperty({ example: '2024-01-15T10:35:00Z', description: 'When the task must be completed by' })
    expiresAt: Date;
}
