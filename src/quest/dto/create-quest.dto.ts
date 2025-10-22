import {IsString, IsNumber, Min, Max, MaxLength, IsNotEmpty, IsOptional} from 'class-validator';
import {ApiProperty} from '@nestjs/swagger';
import {Type} from 'class-transformer';

export class CreateQuestDto {
    @ApiProperty({
        example: 'The Lost Treasure of Verde Island',
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(300)
    title: string;

    @ApiProperty({
        example: 'A brief, engaging summary of the quest\'s story.',
    })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    description?: string;

    @ApiProperty({
        example: 40.7128
    })
    @Type(() => Number)
    @IsNumber()
    @Min(-90)
    @Max(90)
    startingLatitude: number;

    @ApiProperty({
        example: -74.0060
    })
    @Type(() => Number)
    @IsNumber()
    @Min(-180)
    @Max(180)
    startingLongitude: number;

    @ApiProperty({
        example: 50,
    })
    @Type(() => Number)
    @IsNumber()
    @Min(20)
    @Max(10000)
    startingRadiusMeters: number;

    @ApiProperty({
        example: 1,
    })
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    minParticipantCount: number;

    @ApiProperty({
        example: 50,
    })
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    @Max(100)
    maxParticipantCount: number;

    @ApiProperty({
        example: 120,
    })
    @Type(() => Number)
    @IsNumber()
    @Min(10)
    @Max(1440)
    maxDurationMinutes: number;
}