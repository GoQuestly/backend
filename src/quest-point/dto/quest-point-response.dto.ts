import { ApiProperty } from '@nestjs/swagger';

import {CodeWordTaskResponseDto} from "@/quest-task/dto/code-word-task.dto";
import {PhotoTaskResponseDto} from "@/quest-task/dto/photo-task.dto";
import {QuizTaskResponseDto} from "@/quest-task/dto";

export type QuestTaskResponseDto = QuizTaskResponseDto | CodeWordTaskResponseDto | PhotoTaskResponseDto;

export class QuestPointResponseDto {
    @ApiProperty({ example: 1 })
    questPointId: number;

    @ApiProperty({ example: 'Central Park Fountain' })
    name: string;

    @ApiProperty({ example: 40.7749 })
    latitude: number;

    @ApiProperty({ example: -73.9772 })
    longitude: number;

    @ApiProperty({ example: 1 })
    orderNum: number;

    @ApiProperty({
        nullable: true,
        description: 'Quest task details (QuizTaskResponseDto | CodeWordTaskResponseDto | PhotoTaskResponseDto)'
    })
    task?: QuestTaskResponseDto | null;
}