import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, MaxLength, MinLength } from "class-validator";

export class LoginDto {
    @ApiProperty({ description: 'User email address' })
    @IsEmail()
    @MaxLength(100)
    @IsNotEmpty()
    readonly email: string;

    @ApiProperty({ description: 'User password' })
    @MaxLength(255)
    @MinLength(4)
    @IsNotEmpty()
    readonly password: string;
}