import {Injectable, UnauthorizedException} from '@nestjs/common';
import {PassportStrategy} from '@nestjs/passport';
import {ExtractJwt, Strategy} from 'passport-jwt';
import {InjectRepository} from '@nestjs/typeorm';
import {Repository} from 'typeorm';
import {AdminEntity} from '@/common/entities/admin.entity';

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
    constructor(
        @InjectRepository(AdminEntity)
        private readonly adminRepo: Repository<AdminEntity>,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: process.env.JWT_SECRET,
        });
    }

    async validate(payload: any) {
        if (payload.role && payload.role !== 'admin') {
            throw new UnauthorizedException('Invalid token type for admin endpoint');
        }

        const adminId = payload.sub;

        const admin = await this.adminRepo.findOne({
            where: {adminId}
        });

        if (!admin) {
            throw new UnauthorizedException('Invalid admin token');
        }

        return {adminId: admin.adminId, email: admin.email, role: payload.role || 'admin'};
    }
}
