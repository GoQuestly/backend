import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
    try {
        const app = await NestFactory.create(AppModule);

        await app.listen(process.env.APP_PORT || 3000, () => {
            console.log('NestJS application started successfully!');
        });

    } catch (error) {
        if (error instanceof Error) {
            console.error('CRITICAL STARTUP ERROR:', error.stack);
        } else {
            console.error('CRITICAL STARTUP ERROR:', error);
        }
        process.exit(1);
    }
}

console.log('Happy developing ✨');
bootstrap();