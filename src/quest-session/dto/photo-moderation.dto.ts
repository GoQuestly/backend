import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsString } from "class-validator";

export class PendingPhotoDto {
    @ApiProperty({
        example: 1
    })
    participantTaskPhotoId: number;

    @ApiProperty({
        example: 1
    })
    participantTaskId: number;

    @ApiProperty({
        example: 1
    })
    userId: number;

    @ApiProperty({
        example: 'John Doe'
    })
    userName: string;

    @ApiProperty({
        example: 1
    })
    questTaskId: number;

    @ApiProperty({
        example: 'Photo Task at Central Park'
    })
    taskDescription: string;

    @ApiProperty({
        example: 'Central Park'
    })
    pointName: string;

    @ApiProperty({
        example: '/uploads/task-photos/photo.jpg'
    })
    photoUrl: string;

    @ApiProperty({
        example: '2025-11-23T10:15:00Z'
    })
    uploadDate: Date;
}

export class PhotoModerationActionDto {
    @ApiProperty({
        example: true,
        description: 'True to approve, false to reject'
    })
    @IsBoolean()
    approved: boolean;

    @ApiProperty({
        example: 'Photo does not match the task requirements',
        required: false,
        description: 'Reason for rejection (required if approved is false)'
    })
    @IsOptional()
    @IsString()
    rejectionReason?: string;
}

export class PhotoModerationResponseDto {
    @ApiProperty({
        example: true
    })
    success: boolean;

    @ApiProperty({
        example: 'Photo approved successfully'
    })
    message: string;

    @ApiProperty({
        example: 10,
        description: 'Score adjustment (positive for approval, negative for rejection)'
    })
    scoreAdjustment: number;

    @ApiProperty({
        example: 150,
        description: 'Participant total score after moderation'
    })
    totalScore: number;
}