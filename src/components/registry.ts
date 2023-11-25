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

export class Registry extends EventTarget
{
    private readonly serverEvents: EventSource;

    constructor(
        public readonly baseUrl: string = import.meta.env.VITE_API_URL,
    ) {
        super();
        this.serverEvents = new EventSource(`${this.baseUrl}/sse/v1/devices`);
        this.serverEvents.addEventListener("update", this.handleDeviceUpdate.bind(this));
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
        return await fetch(`${this.baseUrl}/api/v1/devices`)
            .then(response => response.json())
            .then(response => {
                return response.data;
            });
    }

    async call(deviceId: string, method: string, params: object = {}): Promise<Result>
    {
        return await fetch(`${this.baseUrl}/api/v1/devices/${deviceId}/${method}`, {method: "post"})
            .then(response => response.json())
            .then(response => {
                console.log(response);
                const result = response.result;
                return new Result(result.code, result.data);
            });
    }
}

export const registry = new Registry();