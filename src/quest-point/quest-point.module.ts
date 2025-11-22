import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuestPointEntity } from '@/common/entities/quest-point.entity';
import { QuestEntity } from '@/common/entities/quest.entity';
import { QuestSessionEntity } from '@/common/entities/quest-session.entity';
import { QuestPointService } from './quest-point.service';
import { QuestPointController } from './quest-point.controller';
import { QuestSessionModule } from "@/quest-session/quest-session.module";

@Module({
    imports: [TypeOrmModule.forFeature([QuestPointEntity, QuestEntity, QuestSessionEntity]), QuestSessionModule],
    providers: [QuestPointService],
    controllers: [QuestPointController],
})
export class QuestPointModule {
}