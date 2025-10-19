import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from "@nestjs/common";
import {NestExpressApplication} from '@nestjs/platform-express';
import {join} from 'path';

async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule, {
        cors: {
            origin: '*',
            credentials: true,
            methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
        },
    });

    app.useGlobalPipes(
        new ValidationPipe({
            transform: true,
            whitelist: true,
            forbidNonWhitelisted: true,
        }),
    );

    const config = new DocumentBuilder()
        .setTitle('GoQuestly API')
        .setDescription('API documentation for GoQuestly backend')
        .setVersion('1.0')
        .addBearerAuth()
        .build();

    const document = SwaggerModule.createDocument(app, config);

    SwaggerModule.setup('api/docs', app, document, {
        swaggerOptions: {
            persistAuthorization: true,
        },
    });

    app.useStaticAssets(join(__dirname, '..', 'uploads'), {
        prefix: '/uploads/',
    });

    await app.listen(process.env.PORT ?? 3000);
}

bootstrap();