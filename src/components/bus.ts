type Message = {id: number, x: string, result?: Result};
type Result = {code: number, data: object};

class ResultEvent extends Event
{
    constructor(
        public readonly result: Result
    )
    {
        super('execute.result');
    }
}

export class Bus
{
    private client: WebSocket;

    private readonly events: EventTarget;

    private waitingResult: Map<number, (value: Result) => void> = new Map();

    constructor(
        public readonly wsUrl: string = import.meta.env.VITE_WS_URL,
    ) {
        this.events = new EventTarget();
        this.connect();
    }

    private connect()
    {
        this.client = new WebSocket(this.wsUrl);
        this.client.onopen = this.handleConnected.bind(this);
        this.client.onclose = this.handleDisconnect.bind(this);
        this.client.onmessage = this.handleMessage.bind(this);
    }

    private handleDisconnect()
    {
        console.log('bus: disconnected, trying to reconnect');
        this.connect();
    }

    private handleConnected()
    {
        console.log('bus: connected');
        this.events.dispatchEvent(new Event('connected'));
    }

    private handleMessage(event: MessageEvent)
    {
        console.log('bus: rcv message', event);

        const message: Message = JSON.parse(event.data);

        if (message.x === 'r' && this.waitingResult.has(message.id)) {
            this.waitingResult.get(message.id).call(this, message.result);
            this.waitingResult.delete(message.id);
        }
    }

    async execute(deviceId: string, method: string, params: object = {}): Promise<Result>
    {
        if (this.client.readyState !== WebSocket.OPEN) {
            await new Promise(resolve => {
                this.events.addEventListener('connected', () => resolve(true));
            });
        }

        return new Promise((resolve: (arg: Result) => void) => {
            const command = {x: 'q', id: Date.now(), data: {device: deviceId, method: method, params: params}};

            this.waitingResult.set(command.id, resolve);
            this.client.send(JSON.stringify(command));

            setTimeout(() => {
                if (!this.waitingResult.has(command.id)) {
                    return;
                }

                this.waitingResult.delete(command.id);
                resolve({code: -1, data: {error: 'Timeout'}});
            }, 3000)
        });
    }
}

export const bus = new Bus();