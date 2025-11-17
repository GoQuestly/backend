import {IsBoolean, IsInt, IsNotEmpty, IsString, Max, Min} from 'class-validator';
import {ApiProperty} from '@nestjs/swagger';
import {QuestTaskType} from '@/common/enums/QuestTaskType';
import {MAX_TASK_DURATION_SECONDS} from "@/quest-task/quest-task.constants";

export class BaseCodeWordTaskDto {
    @ApiProperty({ example: 'Find the code word hidden in the location', required: false })
    @IsString()
    @IsNotEmpty()
    description?: string;

    @ApiProperty({ example: 300 })
    @IsInt()
    @Min(15)
    @Max(MAX_TASK_DURATION_SECONDS)
    maxDurationSeconds: number;

    @ApiProperty({ example: true })
    @IsBoolean()
    isRequiredForNextPoint?: boolean;

    @ApiProperty({ example: 100, description: 'Score points for completing the task' })
    @IsInt()
    @Min(0)
    scorePointsCount?: number;

    @ApiProperty({ example: 'SECRET123' })
    @IsString()
    @IsNotEmpty()
    codeWord?: string;
}

export class CreateCodeWordTaskDto extends BaseCodeWordTaskDto {}

export class UpdateCodeWordTaskDto extends BaseCodeWordTaskDto {}

export class CodeWordTaskResponseDto {
    @ApiProperty()
    questTaskId: number;

    @ApiProperty({ enum: QuestTaskType, example: QuestTaskType.CODE_WORD })
    taskType: QuestTaskType.CODE_WORD;

    @ApiProperty({ required: false })
    description?: string;

    @ApiProperty()
    maxDurationSeconds: number;

    @ApiProperty()
    isRequiredForNextPoint: boolean;

    @ApiProperty({ example: 100 })
    scorePointsCount: number;

    @ApiProperty({ example: 'SECRET123' })
    codeWord: string;
}
