import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '@/common/entities/user.entity';
import { UserBannedException } from '@/common/exceptions/user-banned.exception';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        @InjectRepository(UserEntity)
        private readonly userRepo: Repository<UserEntity>,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: process.env.JWT_SECRET,
        });
    }

    async validate(payload: any) {
        const user = await this.userRepo.findOne({
            where: { userId: payload.sub },
            select: ['userId', 'email', 'isBanned']
        });

        if (user && user.isBanned) {
            throw new UserBannedException();
        }

        return { userId: payload.sub, email: payload.email, role: payload.role || 'user' };
    }
}