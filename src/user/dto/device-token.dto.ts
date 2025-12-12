import { IsNotEmpty, IsString } from 'class-validator';

export class RegisterDeviceTokenDto {
    @IsNotEmpty()
    @IsString()
    deviceToken: string;
}