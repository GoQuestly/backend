import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    BadRequestException,
    forwardRef,
    Inject
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as polyline from '@mapbox/polyline';
import { ParticipantLocationEntity } from '@/common/entities/ParticipantLocationEntity';
import { ParticipantEntity } from '@/common/entities/ParticipantEntity';
import { QuestSessionEntity } from '@/common/entities/QuestSessionEntity';
import { ParticipantStatus } from '@/common/enums/ParticipantStatus';
import { RejectionReason } from '@/common/enums/RejectionReason';
import { UpdateLocationDto } from "@/quest-session/dto/update-location.dto";
import { ParticipantLocationDto } from "@/quest-session/dto/participant-location.dto";
import { LocationHistoryResponseDto } from "@/quest-session/dto/location-history-response.dto";
import { ParticipantRouteDto } from "@/quest-session/dto/participant-route.dto";
import { LocationGateway } from './location.gateway';

@Injectable()
export class LocationService {
    constructor(
        @InjectRepository(ParticipantLocationEntity)
        private locationRepository: Repository<ParticipantLocationEntity>,
        @InjectRepository(ParticipantEntity)
        private participantRepository: Repository<ParticipantEntity>,
        @InjectRepository(QuestSessionEntity)
        private sessionRepository: Repository<QuestSessionEntity>,
        @Inject(forwardRef(() => LocationGateway))
        private locationGateway: LocationGateway,
    ) {}

    async updateLocation(
        sessionId: number,
        userId: number,
        dto: UpdateLocationDto
    ): Promise<ParticipantLocationDto> {
        const session = await this.sessionRepository.findOne({
            where: { questSessionId: sessionId },
            relations: ['quest'],
        });

        if (!session) {
            throw new NotFoundException(`Session with ID ${sessionId} not found`);
        }

        if (session.endReason) {
            throw new BadRequestException('Cannot update location for ended session');
        }

        const participant = await this.participantRepository.findOne({
            where: {
                session: { questSessionId: sessionId },
                user: { userId },
            },
            relations: ['user', 'session'],
        });

        if (!participant) {
            throw new ForbiddenException('You are not a participant in this session');
        }

        const existingLocationCount = await this.locationRepository.count({
            where: {
                participant: { participantId: participant.participantId }
            }
        });

        const isFirstLocation = existingLocationCount === 0;

        const location = this.locationRepository.create({
            participant,
            latitude: dto.latitude,
            longitude: dto.longitude,
            timestamp: new Date(),
        });

        const savedLocation = await this.locationRepository.save(location);

        if (isFirstLocation && participant.participationStatus === ParticipantStatus.PENDING) {
            const distance = this.calculateDistance(
                session.quest.startingLatitude,
                session.quest.startingLongitude,
                dto.latitude,
                dto.longitude
            );

            if (distance > session.quest.startingRadiusMeters) {
                participant.participationStatus = ParticipantStatus.REJECTED;
                participant.rejectionReason = RejectionReason.TOO_FAR_FROM_START;
                await this.participantRepository.save(participant);

                await this.locationGateway.notifyParticipantRejected(sessionId, participant);
            } else {
                participant.participationStatus = ParticipantStatus.APPROVED;
                participant.rejectionReason = null;
                await this.participantRepository.save(participant);
            }
        }

        return this.mapToDto(savedLocation, participant);
    }

    async getSessionLocations(
        sessionId: number,
        userId: number,
        participantId?: number,
    ): Promise<LocationHistoryResponseDto> {
        const session = await this.sessionRepository.findOne({
            where: { questSessionId: sessionId },
            relations: ['quest', 'quest.organizer', 'participants', 'participants.user'],
        });

        if (!session) {
            throw new NotFoundException(`Session with ID ${sessionId} not found`);
        }

        const isOrganizer = session.quest.organizer.userId === userId;
        if (!isOrganizer) {
            throw new ForbiddenException('Only the session organizer can access location history');
        }

        const participantsToProcess = participantId
            ? session.participants.filter(p => p.participantId === participantId)
            : session.participants;

        const routes: ParticipantRouteDto[] = [];

        for (const participant of participantsToProcess) {
            const locations = await this.locationRepository.find({
                where: {
                    participant: { participantId: participant.participantId }
                },
                order: {
                    timestamp: 'ASC'
                },
            });

            if (locations.length === 0) {
                continue;
            }

            const coordinates: [number, number][] = locations.map(loc => [
                loc.latitude,
                loc.longitude
            ]);

            const encodedLine = polyline.encode(coordinates);

            routes.push({
                participantId: participant.participantId,
                userId: participant.user.userId,
                userName: participant.user.name,
                line: encodedLine,
                pointCount: locations.length,
                startTime: locations[0].timestamp,
                endTime: locations[locations.length - 1].timestamp,
            });
        }

        return {
            routes,
            totalParticipants: routes.length,
        };
    }

    async getLatestLocations(sessionId: number, userId: number): Promise<ParticipantLocationDto[]> {
        const session = await this.sessionRepository.findOne({
            where: { questSessionId: sessionId },
            relations: ['quest', 'quest.organizer', 'participants', 'participants.user'],
        });

        if (!session) {
            throw new NotFoundException(`Session with ID ${sessionId} not found`);
        }

        const isOrganizer = session.quest.organizer.userId === userId;
        const isParticipant = session.participants.some(p => p.user.userId === userId);

        if (!isOrganizer && !isParticipant) {
            throw new ForbiddenException('You do not have access to this session');
        }

        const latestLocations: ParticipantLocationDto[] = [];

        for (const participant of session.participants) {
            const location = await this.locationRepository.findOne({
                where: {
                    participant: { participantId: participant.participantId }
                },
                relations: ['participant', 'participant.user'],
                order: {
                    timestamp: 'DESC'
                }
            });

            if (location) {
                latestLocations.push(this.mapToDto(location, location.participant));
            }
        }

        return latestLocations;
    }

    async rejectParticipantsWithoutLocation(sessionId: number) {
        const session = await this.sessionRepository.findOne({
            where: { questSessionId: sessionId },
            relations: ['quest', 'participants', 'participants.user'],
        });

        if (!session) {
            throw new NotFoundException(`Session with ID ${sessionId} not found`);
        }

        for (const participant of session.participants) {
            if (participant.participationStatus !== ParticipantStatus.PENDING) {
                continue;
            }

            const hasLocation = await this.locationRepository.exists({
                where: {
                    participant: { participantId: participant.participantId }
                }
            });

            if (!hasLocation) {
                participant.participationStatus = ParticipantStatus.REJECTED;
                participant.rejectionReason = RejectionReason.NO_LOCATION;
                await this.participantRepository.save(participant);

                await this.locationGateway.notifyParticipantRejected(sessionId, participant);
            }
        }
    }

    private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const R = 6371e3;
        const phi1 = (lat1 * Math.PI) / 180;
        const phi2 = (lat2 * Math.PI) / 180;
        const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
        const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

        const a =
            Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    }

    private mapToDto(location: ParticipantLocationEntity, participant: ParticipantEntity): ParticipantLocationDto {
        return {
            participantLocationId: location.participantLocationId,
            participantId: participant.participantId,
            userId: participant.user.userId,
            userName: participant.user.name,
            latitude: location.latitude,
            longitude: location.longitude,
            timestamp: location.timestamp,
        };
    }
}
