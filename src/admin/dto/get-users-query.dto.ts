import {ApiProperty} from '@nestjs/swagger';
import {IsEnum, IsInt, IsOptional, IsString, Max, Min} from 'class-validator';
import {Type} from 'class-transformer';

export enum UserSortBy {
    REGISTRATION = 'registration',
    NAME = 'name'
}

export enum SortOrder {
    ASC = 'ASC',
    DESC = 'DESC'
}

export class GetUsersQueryDto {
    @ApiProperty({
        example: 1,
        required: false,
        minimum: 1,
        description: 'Page number'
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    pageNumber?: number = 1;

    @ApiProperty({
        example: 10,
        required: false,
        minimum: 1,
        maximum: 100,
        description: 'Items per page'
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    pageSize?: number = 10;

    @ApiProperty({
        example: 'john@example.com',
        required: false,
        description: 'Search in email and name fields'
    })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiProperty({
        enum: UserSortBy,
        example: UserSortBy.REGISTRATION,
        required: false,
        description: 'Sort by field'
    })
    @IsOptional()
    @IsEnum(UserSortBy)
    sortBy?: UserSortBy = UserSortBy.REGISTRATION;

    @ApiProperty({
        enum: SortOrder,
        example: SortOrder.DESC,
        required: false,
        description: 'Sort order'
    })
    @IsOptional()
    @IsEnum(SortOrder)
    sortOrder?: SortOrder = SortOrder.DESC;
}
