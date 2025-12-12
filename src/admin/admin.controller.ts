import {Body, Controller, Get, HttpCode, HttpStatus, Post, Query, UseGuards, ValidationPipe,} from '@nestjs/common';
import {ApiBearerAuth, ApiTags} from '@nestjs/swagger';
import {AdminService} from './admin.service';
import {AdminLoginDto} from './dto/admin-login.dto';
import {AdminLoginResponseDto} from './dto/admin-login-response.dto';
import {GetUsersQueryDto} from './dto/get-users-query.dto';
import {PaginatedUsersResponseDto} from './dto/paginated-users-response.dto';
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
}
