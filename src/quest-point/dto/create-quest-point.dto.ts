import {IsString, IsNumber, IsNotEmpty, Min, Max} from 'class-validator';
import {ApiProperty} from '@nestjs/swagger';

export class CreateQuestPointDto {
    @ApiProperty({example: 'Central Park Fountain'})
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({example: 40.7749})
    @IsNumber()
    @Min(-90)
    @Max(90)
    latitude: number;

    @ApiProperty({example: -73.9772})
    @IsNumber()
    @Min(-180)
    @Max(180)
    longitude: number;

    @ApiProperty({example: 1})
    @IsNumber()
    orderNum: number;
}