import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive } from 'class-validator';

export class UnbanUserDto {
    @ApiProperty({ example: 1, description: 'User ID to unban' })
    @IsInt()
    @IsPositive()
    userId: number;
}
