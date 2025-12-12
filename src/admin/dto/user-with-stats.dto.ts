import {ApiProperty} from '@nestjs/swagger';

export class UserWithStatsDto {
    @ApiProperty({example: 1})
    userId: number;

    @ApiProperty({example: 'john.doe@example.com'})
    email: string;

    @ApiProperty({example: 'John Doe'})
    name: string;

    @ApiProperty({
        example: 'http://localhost:3000/uploads/avatars/123.jpg',
        nullable: true
    })
    photoUrl: string | null;

    @ApiProperty({example: true})
    isEmailVerified: boolean;

    @ApiProperty({
        example: 5,
        description: 'Number of quests created as organizer'
    })
    questCount: number;

    @ApiProperty({
        example: 12,
        description: 'Number of session participations (all statuses)'
    })
    sessionCount: number;
}
