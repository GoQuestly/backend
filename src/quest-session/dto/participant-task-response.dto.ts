import {ApiProperty} from '@nestjs/swagger';
import {QuestTaskType} from '@/common/enums/QuestTaskType';

export class ParticipantQuizAnswerDto {
    @ApiProperty({example: 1, description: 'Quiz answer ID'})
    quizAnswerId: number;

    @ApiProperty({example: 'London'})
    answer: string;
}

export class ParticipantQuizQuestionDto {
    @ApiProperty({example: 'What is the capital of Great Britain?'})
    question: string;

    @ApiProperty({example: 1})
    orderNumber: number;

    @ApiProperty({example: 10, description: 'Points awarded for correct answer'})
    scorePointsCount: number;

    @ApiProperty({
        type: [ParticipantQuizAnswerDto],
        description: 'Answer options with IDs (without correct answer indication)'
    })
    answers: ParticipantQuizAnswerDto[];
}

export class ParticipantQuizTaskResponseDto {
    @ApiProperty({example: 1})
    questTaskId: number;

    @ApiProperty({enum: QuestTaskType, example: QuestTaskType.QUIZ})
    taskType: QuestTaskType.QUIZ;

    @ApiProperty({example: 'Answer the quiz to proceed', required: false})
    description?: string;

    @ApiProperty({example: 300, description: 'Maximum time to complete task in seconds'})
    maxDurationSeconds: number;

    @ApiProperty({example: true, description: 'Whether task must be completed to proceed'})
    isRequiredForNextPoint: boolean;

    @ApiProperty({example: 100, description: 'Total points available for this quiz'})
    maxScorePointsCount: number;

    @ApiProperty({
        example: 80,
        description: 'Minimum percentage of points required to pass'
    })
    successScorePointsPercent: number;

    @ApiProperty({type: [ParticipantQuizQuestionDto]})
    quizQuestions: ParticipantQuizQuestionDto[];
}

export class ParticipantCodeWordTaskResponseDto {
    @ApiProperty({example: 2})
    questTaskId: number;

    @ApiProperty({enum: QuestTaskType, example: QuestTaskType.CODE_WORD})
    taskType: QuestTaskType.CODE_WORD;

    @ApiProperty({example: 'Find the code word at this location', required: false})
    description?: string;

    @ApiProperty({example: 600, description: 'Maximum time to complete task in seconds'})
    maxDurationSeconds: number;

    @ApiProperty({example: true, description: 'Whether task must be completed to proceed'})
    isRequiredForNextPoint: boolean;

    @ApiProperty({example: 50, description: 'Points awarded for correct code word'})
    scorePointsCount: number;

}

export class ParticipantPhotoTaskResponseDto {
    @ApiProperty({example: 3})
    questTaskId: number;

    @ApiProperty({enum: QuestTaskType, example: QuestTaskType.PHOTO})
    taskType: QuestTaskType.PHOTO;

    @ApiProperty({example: 'Take a photo of the landmark', required: false})
    description?: string;

    @ApiProperty({example: 180, description: 'Maximum time to complete task in seconds'})
    maxDurationSeconds: number;

    @ApiProperty({example: false, description: 'Whether task must be completed to proceed'})
    isRequiredForNextPoint: boolean;

    @ApiProperty({example: 30, description: 'Points awarded for photo submission'})
    scorePointsCount: number;
}

export type ParticipantTaskResponseDto =
    | ParticipantQuizTaskResponseDto
    | ParticipantCodeWordTaskResponseDto
    | ParticipantPhotoTaskResponseDto;