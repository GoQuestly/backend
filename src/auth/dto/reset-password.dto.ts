import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator';

export class RequestPasswordResetDto {
    @ApiProperty({
        description: 'User email address',
        example: 'user@example.com'
    })
    @IsEmail()
    @MaxLength(100)
    @IsNotEmpty()
    readonly email: string;
}

export class VerifyResetTokenDto {
    @ApiProperty({
        description: 'Password reset token from email',
        example: 'your-reset-token'
    })
    @IsString()
    @IsNotEmpty()
    readonly token: string;
}

export class ResetPasswordDto {
    @ApiProperty({
        description: 'Password reset token from email',
        example: 'your-reset-token'
    })
    @IsString()
    @IsNotEmpty()
    readonly token: string;

    @ApiProperty({
        description: 'New password (min 4 chars)',
        example: 'NewPassword123'
    })
    @IsString()
    @MaxLength(255)
    @MinLength(4)
    @IsNotEmpty()
    readonly password: string;

}