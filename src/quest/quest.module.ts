import {Module} from '@nestjs/common';
import {TypeOrmModule} from '@nestjs/typeorm';
import {MulterModule} from '@nestjs/platform-express';
import {QuestController} from './quest.controller';
import {QuestService} from './quest.service';
import {QuestEntity} from '@/common/entities/QuestEntity';
import {UserEntity} from '@/common/entities/UserEntity';

@Module({
    imports: [
        TypeOrmModule.forFeature([QuestEntity, UserEntity]),
        MulterModule.register({
            dest: './uploads/quests',
        }),
    ],
    controllers: [QuestController],
    providers: [QuestService],
    exports: [QuestService],
})
export class QuestModule {
}