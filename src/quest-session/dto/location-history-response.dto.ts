import { ApiProperty } from "@nestjs/swagger";
import { ParticipantRouteDto } from "@/quest-session/dto/participant-route.dto";

export class LocationHistoryResponseDto {
    @ApiProperty({
        type: [ParticipantRouteDto]
    })
    routes: ParticipantRouteDto[];

    @ApiProperty({
        example: 3,
    })
    totalParticipants: number;
}