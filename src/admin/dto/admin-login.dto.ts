import {ApiProperty} from '@nestjs/swagger';
import {IsEmail, IsNotEmpty, MaxLength, MinLength} from 'class-validator';

export class AdminLoginDto {
    @ApiProperty({
        description: 'Admin email address',
        example: 'admin@goquestly.com'
    })
    @IsEmail()
    @MaxLength(100)
    @IsNotEmpty()
    readonly email: string;

    @ApiProperty({
        description: 'Admin password',
        example: 'securePassword123'
    })
    @MaxLength(255)
    @MinLength(4)
    @IsNotEmpty()
    readonly password: string;
}
