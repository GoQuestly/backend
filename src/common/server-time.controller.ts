import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Server Time')
@Controller('server-time')
export class ServerTimeController {
    @Get()
    @ApiOperation({ summary: 'Get current server time in UTC' })
    getServerTime(): { serverTime: string } {
        return {
            serverTime: new Date().toISOString(),
        };
    }
}