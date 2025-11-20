import {QuestSessionEntity} from '@/common/entities/QuestSessionEntity';

export function isSessionActive(session: QuestSessionEntity): boolean {
    const now = new Date();

    if (session.endReason) {
        return false;
    }

    if (session.startDate > now) {
        return false;
    }

    if (session.endDate) {
        return session.endDate > now;
    }

    const questDurationMs = session.quest.maxDurationMinutes * 60 * 1000;
    const maxEndTime = new Date(session.startDate.getTime() + questDurationMs);

    return now < maxEndTime;
}
