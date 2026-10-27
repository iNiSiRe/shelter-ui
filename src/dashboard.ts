import Yaml from "js-yaml";

// A dashboard entry: a device by id, or a card that is no device at all (`widget: history`).
// `wide` spans two columns.
export type Item = {name: string, device?: string, widget?: string, wide?: boolean};

export type Room = {name: string, items: Array<Item>};

export class Dashboard
{
    // dashboard.yaml lists `rooms:` (each a name and its items), or — the older form — a flat
    // `items:` list, shown as one unnamed room.
    async loadRooms(): Promise<Array<Room>>
    {
        const text = await fetch('/dashboard.yaml').then(response => response.text());
        const dashboard: any = Yaml.load(text) ?? {};

        if (Array.isArray(dashboard.rooms)) {
            return dashboard.rooms.map((room: any) => ({name: room.name ?? '', items: room.items ?? []}));
        }

        return [{name: '', items: dashboard.items ?? []}];
    }
}

export const dashboard = new Dashboard();
