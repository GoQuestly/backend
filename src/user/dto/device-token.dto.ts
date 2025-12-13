import { IsNotEmpty, IsString } from 'class-validator';
import {ApiProperty} from "@nestjs/swagger";

export class RegisterDeviceTokenDto {
    @IsNotEmpty()
    @IsString()
    @ApiProperty()
    deviceToken: string;
}