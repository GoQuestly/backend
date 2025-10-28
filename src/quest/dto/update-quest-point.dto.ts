import {PartialType} from '@nestjs/swagger';
import {CreateQuestPointDto} from './create-quest-point.dto';

export class UpdateQuestPointDto extends PartialType(CreateQuestPointDto) {
}