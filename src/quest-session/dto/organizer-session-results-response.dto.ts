import {ApiProperty} from "@nestjs/swagger";
import {SessionStatisticsDto} from "@/quest-session/dto/session-statistics.dto";
import {ParticipantRankingWithRouteDto} from "@/quest-session/dto/participant-ranking-with-route.dto";

export class OrganizerSessionResultsResponseDto {
    @ApiProperty({
        type: SessionStatisticsDto,
        description: 'Session statistics'
    })
    statistics: SessionStatisticsDto;

    @ApiProperty({
        type: [ParticipantRankingWithRouteDto],
        description: 'Participant rankings with routes'
    })
    rankings: ParticipantRankingWithRouteDto[];
}