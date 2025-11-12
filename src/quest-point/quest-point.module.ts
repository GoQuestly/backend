import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuestPointEntity } from '@/common/entities/QuestPointEntity';
import { QuestEntity } from '@/common/entities/QuestEntity';
import { QuestSessionEntity } from '@/common/entities/QuestSessionEntity';
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