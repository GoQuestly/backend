import { Injectable, UnauthorizedException } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '@/common/entities/UserEntity';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class GoogleAuthService {
    private client: OAuth2Client;

    constructor(
        @InjectRepository(UserEntity)
        private readonly userRepo: Repository<UserEntity>,
        private readonly jwtService: JwtService,
    ) {
        this.client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    }

    async verifyGoogleToken(token: string) {
        const ticket = await this.client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        if (!payload) throw new UnauthorizedException('Invalid Google token');

        const { email, name, picture } = payload;

        let user = await this.userRepo.findOne({ where: { email } });
        if (!user) {
            user = this.userRepo.create({
                name,
                email,
                photoUrl: picture || '',
                password: '',
            });
            user = await this.userRepo.save(user);
        }

        const jwtPayload = { sub: user.userId, email: user.email };
        const access_token = this.jwtService.sign(jwtPayload);

        const { password, ...userData } = user;
        return { access_token, user: userData };
    }
}
