// "45 с", "5 хв", "3 год", "2 дн" — how long ago, for the "… тому" labels.
export function prettifyMilliseconds(diff: number): string
{
    const seconds = Math.round(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
        return `${days} дн`;
    } else if (hours > 0) {
        return `${hours} год`;
    } else if (minutes > 0) {
        return `${minutes} хв`;
    } else {
        return `${seconds} с`;
    }
}

export function ago(timestamp: number, now: number = Date.now()): string
{
    const diff = Math.max(0, now - timestamp);
    return diff < 45_000 ? 'щойно' : `${prettifyMilliseconds(diff)} тому`;
}
