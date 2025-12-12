import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Patch,
    Post,
    Query,
    UseGuards,
    ValidationPipe,
} from '@nestjs/common';
import {ApiBearerAuth, ApiTags} from '@nestjs/swagger';
import {AdminService} from './admin.service';
import {AdminLoginDto} from './dto/admin-login.dto';
import {AdminLoginResponseDto} from './dto/admin-login-response.dto';
import {GetUsersQueryDto} from './dto/get-users-query.dto';
import {PaginatedUsersResponseDto} from './dto/paginated-users-response.dto';
import {BanUserDto} from './dto/ban-user.dto';
import {UnbanUserDto} from './dto/unban-user.dto';
import {GetStatisticsQueryDto} from './dto/get-statistics-query.dto';
import {StatisticsResponseDto} from './dto/statistics-response.dto';
import {AdminJwtAuthGuard} from './guards/admin-jwt-auth.guard';
import {GetAdmin} from './decorators/get-admin.decorator';

@ApiTags('Admin')
@Controller('admin')
export class AdminController {
    constructor(private readonly adminService: AdminService) {
    }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(@Body() dto: AdminLoginDto): Promise<AdminLoginResponseDto> {
        return this.adminService.login(dto);
    }

    @Get('users')
    @UseGuards(AdminJwtAuthGuard)
    @ApiBearerAuth()
    async getUsers(
        @Query(new ValidationPipe({transform: true, whitelist: true}))
        query: GetUsersQueryDto,
        @GetAdmin('adminId') adminId: number,
    ): Promise<PaginatedUsersResponseDto> {
        return this.adminService.getUsers(query);
    }

    @Patch('users/ban')
    @UseGuards(AdminJwtAuthGuard)
    @ApiBearerAuth()
    @HttpCode(HttpStatus.NO_CONTENT)
    async banUser(@Body() dto: BanUserDto): Promise<void> {
        return this.adminService.banUser(dto);
    }

    @Patch('users/unban')
    @UseGuards(AdminJwtAuthGuard)
    @ApiBearerAuth()
    @HttpCode(HttpStatus.NO_CONTENT)
    async unbanUser(@Body() dto: UnbanUserDto): Promise<void> {
        return this.adminService.unbanUser(dto);
    }

    @Get('statistics')
    @UseGuards(AdminJwtAuthGuard)
    @ApiBearerAuth()
    async getStatistics(
        @Query(new ValidationPipe({transform: true, whitelist: true}))
        query: GetStatisticsQueryDto,
    ): Promise<StatisticsResponseDto> {
        return this.adminService.getStatistics(query);
    }
}
