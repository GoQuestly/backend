import {ParticipantRankingDto} from "@/quest-session/dto/participant-ranking.dto";
import {ApiProperty} from "@nestjs/swagger";

export class ParticipantRankingWithRouteDto extends ParticipantRankingDto {
    @ApiProperty({
        example: 'u`j~FpxivO_@_@??',
        description: 'Polyline encoded route'
    })
    route: string;
}