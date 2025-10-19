import {IsString, IsNumber, IsOptional, Min, Max, MaxLength, IsNotEmpty} from 'class-validator';
import {ApiPropertyOptional} from '@nestjs/swagger';
import {Type} from 'class-transformer';

export class UpdateQuestDto {
    @ApiPropertyOptional({
        example: 'The Lost Treasure of Verde Island',
    })
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    @MaxLength(300)
    title?: string;

    @ApiPropertyOptional({
        example: 'A brief, engaging summary of the quest\'s story.',
    })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    description?: string;

    @ApiPropertyOptional({
        example: 40.7128
    })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(-90)
    @Max(90)
    startingLatitude?: number;

    @ApiPropertyOptional({
        example: -74.0060
    })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(-180)
    @Max(180)
    startingLongitude?: number;

    @ApiPropertyOptional({
        example: 50,
    })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(20)
    @Max(10000)
    startingRadiusMeters?: number;

    @ApiPropertyOptional({
        example: 1,
    })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    minParticipantCount?: number;

    @ApiPropertyOptional({
        example: 50,
    })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    @Max(100)
    maxParticipantCount?: number;

    @ApiPropertyOptional({
        example: 120,
    })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(10)
    @Max(1440)
    maxDurationMinutes?: number;
}