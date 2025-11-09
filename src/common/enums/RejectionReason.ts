export enum RejectionReason {
    NO_LOCATION = 'NO_LOCATION',
    LOCATION_TOO_OLD = 'LOCATION_TOO_OLD',
    TOO_FAR_FROM_START = 'TOO_FAR_FROM_START'
}

export const RejectionReasonMessages: Record<RejectionReason, string> = {
    [RejectionReason.NO_LOCATION]: 'No location provided before session start',
    [RejectionReason.LOCATION_TOO_OLD]: 'Location too old - must be within 15 minutes of session start',
    [RejectionReason.TOO_FAR_FROM_START]: 'Too far from starting point'
};
