import {ApiProperty} from "@nestjs/swagger";

export class QuizAnswerResponseDto {
    @ApiProperty({example: true, description: 'Whether the answer was accepted'})
    success: boolean;

    @ApiProperty({example: 2, description: 'Number of questions answered so far'})
    answeredCount: number;

    @ApiProperty({example: 5, description: 'Total number of questions in quiz'})
    totalQuestions: number;

    @ApiProperty({example: false, description: 'Whether all questions have been answered'})
    allAnswered: boolean;
}