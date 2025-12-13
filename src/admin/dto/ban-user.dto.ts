import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive } from 'class-validator';

export class BanUserDto {
    @ApiProperty({ example: 1, description: 'User ID to ban' })
    @IsInt()
    @IsPositive()
    userId: number;
}
