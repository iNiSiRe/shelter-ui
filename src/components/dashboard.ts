import Yaml from "js-yaml";

export type Item = {name: string, device: string};

export class Dashboard
{
    async loadItems(): Promise<Array<Item>>
    {
        return await fetch('/dashboard.yaml')
            .then(response => response.text())
            .then(response => {
                const dashboard = Yaml.load(response);
                return dashboard.items;
            });
    }
}

export const dashboard = new Dashboard();