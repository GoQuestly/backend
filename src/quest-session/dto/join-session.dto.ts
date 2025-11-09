import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class JoinSessionDto {
    @ApiProperty({
        example: 'abc123xyz456def789',
    })
    @IsString()
    inviteToken: string;
}