import {creator} from './creator';
import {Options} from './option';

// element to hide by this className
const Invisible = 'invisible';

namespace items {
type ClassNames = {
    readonly item: string; readonly favicon : string; readonly link : string; readonly info : string; readonly url : string; readonly data :
                                                                                                                                          string;
};
const classNames: ClassNames = {
    item : 'item',
    favicon: 'item-favicon',
    link: 'item-link',
    info: 'item-info',
    url: 'item-info-url',
    data: 'item-info-data',
};

// Create .item elements
class Creator {
    public static create(): HTMLElement {
        const element = document.createElement('div');
        element.classList.add(classNames.item, Invisible);
        element.appendChild(Creator.favicon());
        element.appendChild(Creator.link());
        element.appendChild(Creator.info());
        return element;
    }

    private static favicon(): HTMLElement {
        const element     = document.createElement('img');
        element.className = classNames.favicon;
        return element;
    }

    private static link(): HTMLElement {
        const element     = document.createElement('a');
        element.className = classNames.link;
        return element
    }

    private static url(): HTMLElement {
        const element     = document.createElement('p');
        element.className = classNames.url;
        return element;
    }

    private static data(): HTMLElement {
        const element     = document.createElement('span');
        element.className = classNames.data;
        return element;
    }

    private static info(): HTMLElement {
        const element     = document.createElement('div');
        element.className = classNames.info;
        element.appendChild(Creator.url());
        element.appendChild(Creator.data());
        element.appendChild(Creator.data());
        return element;
    }
}

// Set value to each item element
class Modifier {
    public static async modify(element: HTMLElement, object: creator.Object) {
        Modifier.favicon(element, object);
        Modifier.link(element, object);
        Modifier.url(element, object);
        Modifier.info(element, object);
        element.classList.remove(Invisible);
    }

    private static favicon(parent: HTMLElement, object: creator.Object) {
        const element = parent.getElementsByClassName(classNames.favicon)[0] as
                        HTMLImageElement;
        if (typeof object.rawurl != 'undefined') {
            element.src = 'http://www.google.com/s2/favicons?domain_url=' +
                          encodeURIComponent(new URL(object.rawurl).origin);
        }
    }
    private static link(parent: HTMLElement, object: creator.Object) {
        const element = parent.getElementsByClassName(classNames.link)[0] as
                        HTMLLinkElement;
        if (typeof object.title != 'undefined')
            element.innerText = object.title;
        if (typeof object.rawurl != 'undefined') element.href = object.rawurl;
    }
    private static url(parent: HTMLElement, object: creator.Object) {
        const element =
            parent.getElementsByClassName(classNames.url)[0] as HTMLElement;
        if (typeof object.rawurl != 'undefined')
            element.innerText = object.rawurl;
    }
    private static info(parent: HTMLElement, object: creator.Object) {
        const elements = parent.querySelectorAll(
            `.${classNames.info} > .${classNames.data}`);

        if (typeof object.dateTime != 'undefined') {
            const date = new Date(object.dateTime);
            (elements[0] as HTMLElement).innerText =
                date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        }
        if (typeof object.path != 'undefined') {
            (elements[1] as HTMLElement).innerText = object.path;
        } else if (typeof object.visitCount != 'undefined') {
            (elements[1] as HTMLElement).innerText =
                `Visited: ${object.visitCount}`;
        }
    }
}

export const create = Creator.create;
export const modify = Modifier.modify;
}

export type Elements = {
    readonly result: HTMLElement; readonly help : HTMLElement; readonly error :
                                                                            HTMLElement;
};

export class View {
    private index = 0;
    private items: HTMLElement[];

    constructor(private elements: Elements) {
        // Maximum number of initialization of created elements
        const N = 500;

        this.items = new Array(N);
        const df   = document.createDocumentFragment();
        for (let i = 0; i < N; i++) {
            const item    = items.create();
            this.items[i] = item;
            df.appendChild(item);
        }
        this.elements.result.appendChild(df);
    }

    public create(object: creator.Object) {
        if (this.index >= this.items.length) {
            const item = items.create();
            this.items.push(item);
            this.elements.result.appendChild(item);
        }
        items.modify(this.items[this.index], object);
        this.index++;
    }

    public help(options: Options) {
        this.elements.help.classList.remove(Invisible);
        let usage = '';
        for (const name in options) {
            usage += '\n-' + name + '\n';
            for (const describe of options[name].description) {
                usage += ' '.repeat(3) + describe + '\n';
            }
        }
        this.elements.help.innerText = usage;
    }

    public error(message: string) {
        this.elements.error.classList.remove(Invisible);
        this.elements.error.innerText = `Error: ${message}`;
    }

    // hide to all. execute before the search
    public async invisible() {
        this.index = 0;
        // classList.add Adding the same className will not duplication.
        this.elements.help.classList.add(Invisible);
        this.elements.error.classList.add(Invisible);
        for (const item of this.items) {
            item.classList.add(Invisible);
        }
    }
}