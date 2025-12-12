export class ParticipantStatisticsDto {
    totalSessions: number;
    finishedSessions: number;
    finishRate: number;
    averageRank: number | null;
    bestRank: number | null;
    totalScore: number;
    totalCheckpointsPassed: number;
    totalTasksCompleted: number;
    rejectedSessions: number;
    disqualifiedSessions: number;
}