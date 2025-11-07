import { ApiProperty } from "@nestjs/swagger";
import { QuestSessionListResponseDto } from "@/quest-session/dto/quest-session-list-response.dto";

export class PaginatedMySessionsResponseDto {
    @ApiProperty({
        type: [QuestSessionListResponseDto],
    })
    items: QuestSessionListResponseDto[];

    @ApiProperty({
        example: 25,
    })
    total: number;

    @ApiProperty({
        example: 10,
    })
    limit: number;

    @ApiProperty({
        example: 0,
    })
    offset: number;
}