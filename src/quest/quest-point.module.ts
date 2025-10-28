import {Module} from '@nestjs/common';
import {TypeOrmModule} from '@nestjs/typeorm';
import {QuestPointEntity} from '@/common/entities/QuestPointEntity';
import {QuestEntity} from '@/common/entities/QuestEntity';
import {QuestPointService} from './quest-point.service';
import {QuestPointController} from './quest-point.controller';

@Module({
    imports: [TypeOrmModule.forFeature([QuestPointEntity, QuestEntity])],
    providers: [QuestPointService],
    controllers: [QuestPointController],
})
export class QuestPointModule {
}