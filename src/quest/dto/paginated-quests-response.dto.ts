import {ApiProperty} from '@nestjs/swagger';
import {QuestResponseDto} from './quest-response.dto';

export class PaginatedQuestsResponseDto {
    @ApiProperty({type: [QuestResponseDto]})
    items: QuestResponseDto[];

    @ApiProperty({example: 27})
    total: number;

    @ApiProperty({example: 1})
    pageNumber: number;

    @ApiProperty({example: 10})
    pageSize: number;
}