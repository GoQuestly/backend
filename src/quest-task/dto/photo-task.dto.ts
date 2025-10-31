import { IsInt, IsString, IsBoolean, Min, IsNotEmpty, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { QuestTaskType } from '@/common/enums/QuestTaskType';
import { MAX_TASK_DURATION_SECONDS } from "@/quest-task/quest-task.constants";

export class BasePhotoTaskDto {
    @ApiProperty({ example: 'Take a photo at the landmark', required: false })
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

    @ApiProperty({ example: 100, description: 'Score points for completing the task' })
    @IsInt()
    @Min(0)
    scorePointsCount?: number;
}

export class CreatePhotoTaskDto extends BasePhotoTaskDto {}

export class UpdatePhotoTaskDto extends BasePhotoTaskDto {}

export class PhotoTaskResponseDto {
    @ApiProperty()
    questTaskId: number;

    @ApiProperty({ enum: QuestTaskType, example: QuestTaskType.PHOTO })
    taskType: QuestTaskType.PHOTO;

    @ApiProperty({ required: false })
    description?: string;

    @ApiProperty()
    maxDurationSeconds: number;

    @ApiProperty()
    isRequiredForNextPoint: boolean;

    @ApiProperty({ example: 100 })
    scorePointsCount: number;
}
