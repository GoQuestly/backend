export const NOTIFICATION_TYPES = {
    SESSION_REMINDER_EARLY: 'session_reminder_early',
    SESSION_START: 'session_start',
    SESSION_ENDED: 'session_ended',
    PARTICIPANT_REJECTED: 'participant_rejected',
    SESSION_CANCELLED: 'session_cancelled',
} as const;

export const NOTIFICATION_MESSAGES = {
    SESSION_REMINDER_EARLY: {
        title: 'Quest Starting Soon!',
        body: (questTitle: string, minutes: number) =>
            `Quest "${questTitle}" will start in ${minutes} minutes. Get ready!`,
    },
    SESSION_START: {
        title: 'Quest Started!',
        body: (questTitle: string) =>
            `Quest "${questTitle}" has just started. Time to go!`,
    },
    SESSION_ENDED: {
        title: 'Quest Completed',
        body: (questTitle: string) =>
            `Quest "${questTitle}" has ended.`,
    },
    SESSION_ENDED_WITH_RESULTS: {
        title: 'Congratulations! Quest Completed!',
        body: (questTitle: string, rank: number, totalScore: number) =>
            `Quest "${questTitle}" completed!\nYour rank: ${rank}\nScore: ${totalScore}`,
    },
    PARTICIPANT_REJECTED: {
        title: 'Participation Rejected',
        body: (questTitle: string) =>
            `Unfortunately, you were rejected from quest "${questTitle}" because you did not share your location.`,
    },
    SESSION_CANCELLED: {
        title: 'Quest Cancelled',
        body: (questTitle: string) =>
            `The organizer has cancelled quest "${questTitle}".`,
    },
} as const;