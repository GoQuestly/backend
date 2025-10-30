import {QuizTaskResponseDto} from "@/quest/dto/quiz-task.dto";
import {CodeWordTaskResponseDto} from "@/quest/dto/code-word-task.dto";
import {PhotoTaskResponseDto} from "@/quest/dto/photo-task.dto";

export * from './quiz-task.dto';
export * from './code-word-task.dto';
export * from './photo-task.dto';

export type QuestTaskResponseDto =
    | QuizTaskResponseDto
    | CodeWordTaskResponseDto
    | PhotoTaskResponseDto;