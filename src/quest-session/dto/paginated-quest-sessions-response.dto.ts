import { ApiProperty } from "@nestjs/swagger";
import { QuestSessionListResponseDto } from "@/quest-session/dto/quest-session-list-response.dto";

export class PaginatedQuestSessionsResponseDto {
    @ApiProperty({
        type: [QuestSessionListResponseDto],
    })
    items: QuestSessionListResponseDto[];

    @ApiProperty({
        example: 25,
    })
    total: number;

    @ApiProperty({
        example: 1,
    })
    pageNumber: number;

    @ApiProperty({
        example: 10,
    })
    pageSize: number;
}