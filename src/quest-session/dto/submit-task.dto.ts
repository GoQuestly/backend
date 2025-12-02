import {ApiProperty} from '@nestjs/swagger';
import {IsArray, IsNumber} from 'class-validator';

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

