import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsOptional, Max, Min } from "class-validator";
import { Type } from "class-transformer";

export class GetLocationHistoryQueryDto {
    @ApiProperty({
        example: 1,
        required: false,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    participantId?: number;

    @ApiProperty({
        example: 50,
        required: false,
        minimum: 1,
        maximum: 500,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(500)
    limit?: number = 100;
}