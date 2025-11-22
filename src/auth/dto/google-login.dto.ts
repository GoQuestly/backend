import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty } from "class-validator";

export class GoogleLoginDto {
    @ApiProperty()
    @IsNotEmpty()
    token: string;
}