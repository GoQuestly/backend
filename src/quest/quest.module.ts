import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { QuestController } from './quest.controller';
import { QuestService } from './quest.service';
import { QuestEntity } from '@/common/entities/quest.entity';
import { UserEntity } from '@/common/entities/user.entity';
import { QuestSessionEntity } from '@/common/entities/quest-session.entity';
import { QuestSessionModule } from "@/quest-session/quest-session.module";

@Module({
    imports: [
        TypeOrmModule.forFeature([QuestEntity, UserEntity, QuestSessionEntity]),
        MulterModule.register({
            dest: './uploads/quests',
        }),
        QuestSessionModule,
    ],
    controllers: [QuestController],
    providers: [QuestService],
    exports: [QuestService],
})
export class QuestModule {
}