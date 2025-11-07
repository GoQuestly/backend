import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, Max, Min } from "class-validator";

export class UpdateLocationDto {
    @ApiProperty({
        example: 50.4501,
        minimum: -90,
        maximum: 90
    })
    @IsNumber()
    @Min(-90)
    @Max(90)
    latitude: number;

    @ApiProperty({
        example: 30.5234,
        minimum: -180,
        maximum: 180
    })
    @IsNumber()
    @Min(-180)
    @Max(180)
    longitude: number;
}