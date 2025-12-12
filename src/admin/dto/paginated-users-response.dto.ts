import {ApiProperty} from '@nestjs/swagger';
import {UserWithStatsDto} from './user-with-stats.dto';

export class PaginatedUsersResponseDto {
    @ApiProperty({
        type: [UserWithStatsDto],
        description: 'Array of users with statistics'
    })
    items: UserWithStatsDto[];

    @ApiProperty({
        example: 250,
        description: 'Total number of users matching the query'
    })
    total: number;

    @ApiProperty({
        example: 1,
        description: 'Current page number'
    })
    pageNumber: number;

    @ApiProperty({
        example: 10,
        description: 'Number of items per page'
    })
    pageSize: number;
}
