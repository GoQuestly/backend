import {ApiProperty} from "@nestjs/swagger";

export class TaskCompletionResponseDto {
    @ApiProperty({example: true, description: 'Whether the task was completed successfully'})
    success: boolean;

    @ApiProperty({example: 85, description: 'Score earned for this task'})
    scoreEarned: number;

    @ApiProperty({example: 100, description: 'Maximum possible score for this task'})
    maxScore: number;

    @ApiProperty({example: 80, required: false, description: 'Minimum score percentage required (for quiz)'})
    requiredPercentage?: number;

    @ApiProperty({example: true, description: 'Whether the task was passed (score met requirements)'})
    passed: boolean;

    @ApiProperty({example: '2024-01-15T10:32:45Z'})
    completedAt: Date;
}