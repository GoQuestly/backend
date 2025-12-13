import {ApiProperty} from '@nestjs/swagger';

export class AdminLoginResponseDto {
    @ApiProperty({
        description: 'JWT access token',
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
    })
    access_token: string;

    @ApiProperty({
        description: 'Admin email',
        example: 'admin@goquestly.com'
    })
    email: string;

    @ApiProperty({
        description: 'Admin ID',
        example: 1
    })
    adminId: number;
}
