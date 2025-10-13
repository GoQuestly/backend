import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/RegisterDto';
import { LoginDto } from "@/auth/dto/LoginDto";
import { GoogleAuthService } from './google.service';
import { GoogleLoginDto } from "../auth/dto/GoogleLoginDto";

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly googleService: GoogleAuthService, private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('google')
  async googleLogin(@Body() dto: GoogleLoginDto) {
      return this.googleService.verifyGoogleToken(dto.token);
  }
}