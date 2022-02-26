import {Options} from "./option";

export namespace creator {
export type Object = {
    path?: string,
    title?: string,
    rawurl?: string,
    dateTime?: number,
    visitCount?: number,
    transition?: string,
};
export interface Creator {
    create(object: creator.Object): void;
    help(options: Options): void;
    error(message: string): void;
}
}
