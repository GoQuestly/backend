import {ApiProperty} from "@nestjs/swagger";
import {ParticipantRankingDto} from "@/quest-session/dto/participant-ranking.dto";
import {SessionStatisticsDto} from "@/quest-session/dto/session-statistics.dto";

export class SessionResultsResponseDto {
    @ApiProperty({
        type: SessionStatisticsDto,
        description: 'Session statistics'
    })
    statistics: SessionStatisticsDto;

    @ApiProperty({
        type: [ParticipantRankingDto],
        description: 'Participant rankings'
    })
    rankings: ParticipantRankingDto[];
}