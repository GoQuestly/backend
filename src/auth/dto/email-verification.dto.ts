import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class VerifyEmailDto {
    @ApiProperty({
        description: '6-digit verification code',
        example: '123456'
    })
    @IsString()
    @Length(6, 6, { message: 'Verification code must be exactly 6 digits' })
    @Matches(/^\d{6}$/, { message: 'Verification code must contain only digits' })
    @IsNotEmpty()
    readonly code: string;
}