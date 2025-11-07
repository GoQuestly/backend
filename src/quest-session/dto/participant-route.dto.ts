import { ApiProperty } from "@nestjs/swagger";

export class ParticipantRouteDto {
    @ApiProperty({
        example: 1
    })
    participantId: number;

    @ApiProperty({
        example: 1
    })
    userId: number;

    @ApiProperty({
        example: 'John Doe'
    })
    userName: string;

    @ApiProperty({
        example: 'u`j~FpxivO_@_@??',
    })
    line: string;

    @ApiProperty({
        example: 150,
    })
    pointCount: number;

    @ApiProperty({
        example: '2024-01-01T10:00:00Z',
    })
    startTime: Date;

    @ApiProperty({
        example: '2024-01-01T12:00:00Z',
    })
    endTime: Date;
}