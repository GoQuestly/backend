import {
    Controller,
    Get,
    Param,
    Query,
    ParseIntPipe,
    UseGuards,
    ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import { GetUser } from '@/auth/decorators/get-user.decorator';
import { LocationService } from './location.service';
import { ParticipantLocationDto } from "@/quest-session/dto/participant-location.dto";
import { LocationHistoryResponseDto } from "@/quest-session/dto/location-history-response.dto";
import { GetLocationHistoryQueryDto } from "@/quest-session/dto/get-location-history-query.dto";

@ApiTags('Quest Session - Location Tracking')
@ApiBearerAuth()
@Controller('sessions')
@UseGuards(JwtAuthGuard)
export class LocationController {
    constructor(private readonly locationService: LocationService) {}

    @Get(':sessionId/locations')
    @ApiOperation({})
    async getLocationHistory(
        @Param('sessionId', ParseIntPipe) sessionId: number,
        @Query(new ValidationPipe({ transform: true, whitelist: true })) query: GetLocationHistoryQueryDto,
        @GetUser('userId') userId: number,
    ): Promise<LocationHistoryResponseDto> {
        const { participantId } = query;
        return this.locationService.getSessionLocations(sessionId, userId, participantId);
    }

    @Get(':sessionId/locations/latest')
    @ApiOperation({})
    async getLatestLocations(
        @Param('sessionId', ParseIntPipe) sessionId: number,
        @GetUser('userId') userId: number,
    ): Promise<ParticipantLocationDto[]> {
        return this.locationService.getLatestLocations(sessionId, userId);
    }
}
