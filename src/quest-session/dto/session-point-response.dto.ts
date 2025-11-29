import { ApiProperty } from "@nestjs/swagger";
import { TaskStatus } from "@/common/enums/task-status";

export class SessionPointResponseDto {
    @ApiProperty({
        example: 1
    })
    pointId: number;

    @ApiProperty({
        example: 'Central Park'
    })
    pointName: string;

    @ApiProperty({
        example: 1
    })
    orderNumber: number;

    @ApiProperty({
        example: true
    })
    isPassed: boolean;

    @ApiProperty({
        example: 40.7829,
        nullable: true
    })
    pointLatitude: number | null;

    @ApiProperty({
        example: -73.9654,
        nullable: true
    })
    pointLongitude: number | null;

    @ApiProperty({
        example: true
    })
    hasTask: boolean;

    @ApiProperty({
        example: false
    })
    isTaskSuccessCompletionRequiredForNextPoint: boolean;

    @ApiProperty({
        example: TaskStatus.NOT_STARTED,
        nullable: true,
        description: 'Task status: null (no task or locked)',
        enum: TaskStatus
    })
    taskStatus: TaskStatus | null;
}
