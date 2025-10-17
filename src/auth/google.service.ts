import {Injectable} from '@nestjs/common';
import {OAuth2Client} from 'google-auth-library';
import {InjectRepository} from '@nestjs/typeorm';
import {Repository} from 'typeorm';
import {JwtService} from '@nestjs/jwt';
import {UserEntity} from '@/common/entities/UserEntity';

@Injectable()
export class GoogleAuthService {
    private client = new OAuth2Client(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI,
    );

    constructor(
        @InjectRepository(UserEntity)
        private readonly userRepo: Repository<UserEntity>,
        private readonly jwtService: JwtService,
    ) {}

    getAuthUrl() {
        const scopes = ['openid', 'email', 'profile'];
        const url = this.client.generateAuthUrl({
            access_type: 'offline',
            prompt: 'consent',
            scope: scopes,
        });
        return { url };
    }

    async handleCallback(code: string) {
        const { tokens } = await this.client.getToken(code);
        const idToken = tokens.id_token;

        const ticket = await this.client.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        const { email, name, picture } = payload;

        let user = await this.userRepo.findOne({ where: { email } });

        if (!user) {
            user = this.userRepo.create({
                name,
                email,
                password: '',
                photoUrl: picture || '',
                isEmailVerified: true,
            });
            await this.userRepo.save(user);
        } else if (!user.isEmailVerified) {
            user.isEmailVerified = true;
            user.emailVerificationCode = null;
            user.emailVerificationCodeExpires = null;
            await this.userRepo.save(user);
        }

        return this.jwtService.sign({sub: user.userId, email});
    }
}