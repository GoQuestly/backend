import {ArrayMinSize, IsArray, IsBoolean, IsInt, IsNotEmpty, IsString, Max, Min, ValidateNested} from 'class-validator';
import {Type} from 'class-transformer';
import {ApiProperty} from '@nestjs/swagger';
import {QuestTaskType} from '@/common/enums/QuestTaskType';
import {MAX_TASK_DURATION_SECONDS} from "@/quest-task/quest-task.constants";

export class QuizAnswerDto {
    @ApiProperty({ example: 'London' })
    @IsString()
    @IsNotEmpty()
    answer: string;

    @ApiProperty({ example: true })
    @IsBoolean()
    isCorrect: boolean;
}

export class QuizQuestionDto {
    @ApiProperty({ example: 'What is the capital of Great Britain?' })
    @IsString()
    @IsNotEmpty()
    question: string;

    @ApiProperty({ example: 1 })
    @IsInt()
    @Min(1)
    orderNumber: number;

    @ApiProperty({ example: 10 })
    @IsInt()
    @Min(0)
    scorePointsCount: number;

    @ApiProperty({ type: [QuizAnswerDto] })
    @IsArray()
    @ArrayMinSize(2)
    @ValidateNested({ each: true })
    @Type(() => QuizAnswerDto)
    answers: QuizAnswerDto[];
}

export class BaseQuizTaskDto {
    @ApiProperty({ example: 'Complete the quiz to proceed', required: false })
    @IsString()
    @IsNotEmpty()
    description?: string;

    @ApiProperty({ example: 300 })
    @IsInt()
    @Min(0)
    @Max(MAX_TASK_DURATION_SECONDS)
    maxDurationSeconds: number;

    @ApiProperty({ example: true })
    @IsBoolean()
    isRequiredForNextPoint?: boolean;

    @ApiProperty({ example: 50 })
    @IsInt()
    @Min(0)
    @Max(100)
    successScorePointsPercent: number;

    @ApiProperty({ type: [QuizQuestionDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => QuizQuestionDto)
    quizQuestions?: QuizQuestionDto[];
}

export class CreateQuizTaskDto extends BaseQuizTaskDto {}

export class UpdateQuizTaskDto extends BaseQuizTaskDto {}

export class QuizTaskResponseDto {
    @ApiProperty()
    questTaskId: number;

    @ApiProperty({ enum: QuestTaskType, example: QuestTaskType.QUIZ })
    taskType: QuestTaskType.QUIZ;

    @ApiProperty({ required: false })
    description?: string;

    @ApiProperty()
    maxDurationSeconds: number;

    @ApiProperty()
    isRequiredForNextPoint: boolean;

    @ApiProperty({ example: 100 })
    maxScorePointsCount: number;

    @ApiProperty({ example: 80 })
    successScorePointsPercent: number;

    @ApiProperty({ type: [QuizQuestionDto] })
    quizQuestions: QuizQuestionDto[];
}
