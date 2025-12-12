import {ApiProperty} from '@nestjs/swagger';

class StatisticsPeriodDto {
    @ApiProperty({example: 'month'})
    type: string;

    @ApiProperty({example: '2024-11-12T00:00:00.000Z'})
    startDate: string;

    @ApiProperty({example: '2024-12-12T00:00:00.000Z'})
    endDate: string;
}

class StatisticsMetricsDto {
    @ApiProperty({example: 1543, description: 'Total users on platform'})
    totalUsers: number;

    @ApiProperty({example: 47, description: 'New users in period'})
    newUsers: number;

    @ApiProperty({example: 234, description: 'Active users in period (at least 1 action)'})
    activeUsers: number;

    @ApiProperty({example: 423, description: 'Total quests on platform'})
    totalQuests: number;

    @ApiProperty({example: 178, description: 'Total sessions in period'})
    totalSessions: number;

    @ApiProperty({example: 134, description: 'Completed sessions in period'})
    completedSessions: number;

    @ApiProperty({example: 75.3, description: 'Completion rate (% of completed sessions)'})
    completionRate: number;

    @ApiProperty({example: 12, description: 'Active sessions right now'})
    activeSessions: number;

    @ApiProperty({example: 3.1, description: 'User growth % compared to previous period'})
    userGrowth: number;
}

export class StatisticsResponseDto {
    @ApiProperty()
    period: StatisticsPeriodDto;

    @ApiProperty()
    metrics: StatisticsMetricsDto;
}
