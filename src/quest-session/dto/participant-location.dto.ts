import { ApiProperty } from "@nestjs/swagger";

export class ParticipantLocationDto {
    @ApiProperty({
        example: 1
    })
    participantLocationId: number;

    @ApiProperty({
        example: 1
    })
    participantId: number;

    @ApiProperty({
        example: 1,
    })
    userId: number;

    @ApiProperty({
        example: 'John Doe',
    })
    userName: string;

    @ApiProperty({
        example: 50.4501
    })
    latitude: number;

    @ApiProperty({
        example: 30.5234
    })
    longitude: number;

    @ApiProperty({
        example: '2025-10-31T12:34:56Z'
    })
    timestamp: Date;
}