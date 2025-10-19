import {IsString, IsOptional, MaxLength} from 'class-validator';
import {ApiPropertyOptional} from '@nestjs/swagger';

export class UpdateProfileDto {
    @ApiPropertyOptional({
        description: 'User name',
        example: 'John Doe',
        maxLength: 100,
    })
    @IsOptional()
    @IsString()
    @MaxLength(100, {message: 'Name must not exceed 100 characters'})
    name?: string;
}