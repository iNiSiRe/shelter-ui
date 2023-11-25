export function prettifyMilliseconds(diff: number): string
{
    let seconds = (Math.round(diff) / 1000).toFixed(0);
    let hours = Math.floor(seconds / 3600);
    let minutes = Math.floor(seconds / 60);

    if (hours > 0) {
        return hours + ' hours';
    } else if (minutes > 0) {
        return minutes + ' minutes';
    } else {
        return seconds + ' seconds';
    }
}