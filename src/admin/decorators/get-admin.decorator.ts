import {createParamDecorator, ExecutionContext} from '@nestjs/common';

export const GetAdmin = createParamDecorator(
    (data: string | undefined, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest();
        const admin = request.user;

        return data ? admin?.[data] : admin;
    },
);
