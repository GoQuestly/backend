import {Injectable, NotFoundException} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {Repository} from 'typeorm';
import {QuestPointEntity} from '@/common/entities/QuestPointEntity';
import {QuestEntity} from '@/common/entities/QuestEntity';
import {CreateQuestPointDto} from './dto/create-quest-point.dto';
import {UpdateQuestPointDto} from './dto/update-quest-point.dto';

@Injectable()
export class QuestPointService {
    constructor(
        @InjectRepository(QuestPointEntity)
        private questPointRepository: Repository<QuestPointEntity>,
        @InjectRepository(QuestEntity)
        private questRepository: Repository<QuestEntity>,
    ) {
    }

    async findAll(questId: number): Promise<QuestPointEntity[]> {
        return this.questPointRepository.find({
            where: {quest: {questId: questId}},
            order: {orderNum: 'ASC'},
        });
    }

    async create(questId: number, dto: CreateQuestPointDto): Promise<QuestPointEntity> {
        const quest = await this.questRepository.findOne({where: {questId: questId}});
        if (!quest) throw new NotFoundException('Quest not found');

        const pointDto = {...dto, questId: questId};
        const point = this.questPointRepository.create({...pointDto, quest});
        return this.questPointRepository.save(point);
    }

    async update(pointId: number, dto: UpdateQuestPointDto): Promise<QuestPointEntity> {
        const point = await this.questPointRepository.findOne({
            where: {questPointId: pointId},
        });
        if (!point) throw new NotFoundException('Quest point not found');

        const {questId, ...restOfDto} = dto as any;

        Object.assign(point, restOfDto);

        if (questId) {
            const quest = await this.questRepository.findOne({where: {questId: questId}});
            if (!quest) throw new NotFoundException('Quest for update not found');
            point.quest = quest;
        }

        return this.questPointRepository.save(point);
    }

    async remove(pointId: number): Promise<void> {
        const result = await this.questPointRepository.delete(pointId);
        if (result.affected === 0) {
            throw new NotFoundException('Quest point not found');
        }
    }
}