import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UserEntity } from '@/common/entities/UserEntity';
import { RegisterDto } from './dto/RegisterDto';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from "@/auth/dto/LoginDto";

@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(UserEntity)
        private readonly userRepo: Repository<UserEntity>,
        private readonly jwtService: JwtService,
    ) {
    }

    async register(dto: RegisterDto) {
        const existing = await this.userRepo.findOne({where: {email: dto.email}});
        if (existing) throw new BadRequestException('Email already registered');

        const hashedPassword = await bcrypt.hash(dto.password, 10);
        const user = this.userRepo.create({
            name: dto.name,
            email: dto.email,
            password: hashedPassword,
        });
        const savedUser = await this.userRepo.save(user);

        const payload = {sub: savedUser.userId, email: savedUser.email};
        const token = this.jwtService.sign(payload);

        const {password, ...userData} = savedUser;

        return {
            access_token: token,
            user: userData,
        };
    }

    async validateUser(email: string, pass: string): Promise<UserEntity | null> {
        const user = await this.userRepo.findOne({where: {email}});
        if (user && (await bcrypt.compare(pass, user.password))) {
            return user;
        }
        return null;
    }

    async login(dto: LoginDto) {
        const user = await this.userRepo.findOne({where: {email: dto.email}});
        if (!user) throw new UnauthorizedException('Invalid email or password');

        const isMatch = await bcrypt.compare(dto.password, user.password);
        if (!isMatch) throw new UnauthorizedException('Invalid email or password');

        const payload = {sub: user.userId, email: user.email};
        const access_token = this.jwtService.sign(payload);

        const {password, ...userData} = user;
        return {
            access_token,
            user: userData,
        };
    }
}