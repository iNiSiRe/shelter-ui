import {ref} from "vue";

export class Result {
    constructor(
        public code: number,
        public data: object
    ) {
    }
}

// export class Device {
//     constructor(
//         public readonly id: string,
//         public readonly properties: object
//     ) {
//     }
// }

export type Device = {id: string, model: string, properties: object};

export class DeviceUpdateEvent extends Event
{
    constructor(
        public readonly deviceId: string,
        public readonly properties: object
    ) {
        super('device.update');
    }
}

// The network may still be waking up when the app returns (the Tailscale tunnel on cellular).
const RELOAD_ATTEMPTS = 3;
const RELOAD_RETRY_DELAY = 2000;

export class Registry extends EventTarget
{
    private serverEvents: EventSource;

    constructor(
        // The Pi the page came from, unless the build names another: the same build then works
        // at home (192.168.0.197) and over Tailscale (shelter-pi).
        public readonly baseUrl: string = import.meta.env.VITE_API_URL || `${location.protocol}//${location.hostname}:8080`,
    ) {
        super();
        this.serverEvents = this.openServerEvents();

        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                this.resume();
            }
        });
    }

    private openServerEvents(): EventSource
    {
        const events = new EventSource(`${this.baseUrl}/sse/v1/devices`);
        events.addEventListener("update", this.handleDeviceUpdate.bind(this));

        return events;
    }

    // iOS may cut the stream of an app in the background, and the server does not replay what was
    // missed, so a returning app starts a new stream and reads the devices again. The stream goes
    // first: an update that lands between the two is then not lost.
    private resume(): void
    {
        this.serverEvents.close();
        this.serverEvents = this.openServerEvents();

        this.reloadDevices();
    }

    private async reloadDevices(attemptsLeft: number = RELOAD_ATTEMPTS): Promise<void>
    {
        try {
            for (const device of await this.loadDevices()) {
                this.dispatchEvent(new DeviceUpdateEvent(device.id, device.properties));
            }
        } catch {
            if (attemptsLeft > 1) {
                setTimeout(() => this.reloadDevices(attemptsLeft - 1), RELOAD_RETRY_DELAY);
            }
        }
    }

    private handleDeviceUpdate(event: MessageEvent): void
    {
        const update = JSON.parse(event.data);
        this.dispatchEvent(new DeviceUpdateEvent(update.device, update.data.properties));
    }

    onDeviceUpdate(handler: (arg: DeviceUpdateEvent) => void): void
    {
        this.addEventListener('device.update', handler);
    }

    async loadDevices(): Promise<Array<Device>>
    {
        return await fetch(`${this.baseUrl}/api/v1/devices`, {cache: 'no-store'})
            .then(response => response.json())
            .then(response => {
                return response.data;
            });
    }

    async call(deviceId: string, method: string, params: object = {}): Promise<Result>
    {
        return await fetch(
            `${this.baseUrl}/api/v1/devices/${deviceId}/${method}`,
            {
                method: "post",
                body: JSON.stringify(params),
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        )
        .then(response => response.json())
        .then(response => {
            // console.log(response);
            const result = response.result;
            return new Result(result.code, result.data);
        });
    }
}

export const registry = new Registry();