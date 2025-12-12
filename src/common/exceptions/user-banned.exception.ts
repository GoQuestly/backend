import { ForbiddenException } from '@nestjs/common';

export class UserBannedException extends ForbiddenException {
    constructor() {
        super({
            statusCode: 403,
            message: 'User account has been banned',
            error: 'USER_BANNED'
        });
    }
}
