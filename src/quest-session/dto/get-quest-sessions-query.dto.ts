import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsOptional, Max, Min } from "class-validator";
import { Type } from "class-transformer";

export class GetQuestSessionsQueryDto {
    @ApiProperty({
        example: 1,
        required: false,
        minimum: 1,
        description: 'Page number'})
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
        description: 'Items per page'})
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    pageSize?: number = 10;
}