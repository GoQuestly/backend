import {ApiPropertyOptional} from '@nestjs/swagger';
import {IsEnum, IsOptional} from 'class-validator';

export enum StatisticsPeriod {
    DAY = 'day',
    WEEK = 'week',
    MONTH = 'month',
    YEAR = 'year',
    ALL_TIME = 'all-time'
}

export class GetStatisticsQueryDto {
    @ApiPropertyOptional({
        enum: StatisticsPeriod,
        default: StatisticsPeriod.MONTH,
        description: 'Period for statistics'
    })
    @IsEnum(StatisticsPeriod)
    @IsOptional()
    period?: StatisticsPeriod = StatisticsPeriod.MONTH;
}
