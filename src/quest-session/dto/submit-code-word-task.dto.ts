import {ApiProperty} from "@nestjs/swagger";
import {IsNotEmpty, IsString} from "class-validator";

export class SubmitCodeWordTaskDto {
    @ApiProperty({example: 'SECRET123', description: 'The code word found at the location'})
    @IsString()
    @IsNotEmpty()
    codeWord: string;
}