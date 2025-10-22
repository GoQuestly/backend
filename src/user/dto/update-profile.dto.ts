import {IsString, IsOptional, MaxLength, IsNotEmpty} from 'class-validator';
import {ApiPropertyOptional} from '@nestjs/swagger';

export class UpdateProfileDto {
    @ApiPropertyOptional({
        description: 'User name',
        example: 'John Doe',
        maxLength: 100,
    })
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    @MaxLength(100, {message: 'Name must not exceed 100 characters'})
    name?: string;
}