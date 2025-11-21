import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNumber, IsString } from 'class-validator';

export class SubmitQuizAnswerDto {
    @ApiProperty({
        example: 1,
        description: 'ID of the quiz question being answered'
    })
    @IsNumber()
    questionId: number;

    @ApiProperty({
        example: [3, 5],
        description: 'Array of selected answer IDs (single element for single-answer questions)',
        type: [Number]
    })
    @IsArray()
    @IsNumber({}, { each: true })
    answerIds: number[];
}

export class QuizAnswerResponseDto {
    @ApiProperty({ example: true, description: 'Whether the answer was accepted' })
    success: boolean;

    @ApiProperty({ example: 2, description: 'Number of questions answered so far' })
    answeredCount: number;

    @ApiProperty({ example: 5, description: 'Total number of questions in quiz' })
    totalQuestions: number;

    @ApiProperty({ example: false, description: 'Whether all questions have been answered' })
    allAnswered: boolean;
}

export class SubmitCodeWordTaskDto {
    @ApiProperty({ example: 'SECRET123', description: 'The code word found at the location' })
    @IsString()
    codeWord: string;
}

export class TaskCompletionResponseDto {
    @ApiProperty({ example: true, description: 'Whether the task was completed successfully' })
    success: boolean;

    @ApiProperty({ example: 85, description: 'Score earned for this task' })
    scoreEarned: number;

    @ApiProperty({ example: 100, description: 'Maximum possible score for this task' })
    maxScore: number;

    @ApiProperty({ example: 80, required: false, description: 'Minimum score percentage required (for quiz)' })
    requiredPercentage?: number;

    @ApiProperty({ example: true, description: 'Whether the task was passed (score met requirements)' })
    passed: boolean;

    @ApiProperty({ example: '2024-01-15T10:32:45Z' })
    completedAt: Date;
}
