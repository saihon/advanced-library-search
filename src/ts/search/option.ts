
export enum Type {
    NoArgument = 0,
    OptionalArgument,
    RequiredArgument
}

export class Option {
    public value: string|undefined;
    private _description: string[];
    constructor(private _name: string,
                private _type: Type,
                ...description: string[]) {
        this._description = description;
    }
    get name(): string {
        return this._name;
    }
    get description(): string[] {
        return this._description;
    }
    get type(): Type {
        return this._type;
    }
    hasSpecified(): boolean {
        return typeof this.value != 'undefined';
    }
}

export type Options = {
    [key: string]: Option
};

export class Parser {
    private options: Options = {};

    constructor(...a: Option[]) {
        for (const v of a) {
            this.options[v.name] = v;
        }
    }

    private split(s: string) {
        s = s.trim();

        const a = [];
        const l = s.length - 1;

        let i = 0, j = 0;

        loop: while (true) {
            const c = s.charCodeAt(j);

            switch (c) {
            case 32:
            case 12288:
                if (j > i) {
                    a.push(s.slice(i, j));
                }
                i = j = j + 1;
                continue loop;
            case 34:
            case 39:
                if (i < j) {
                    a.push(s.slice(i, j));
                    i = j;
                }
                for (let x = j + 1; x <= l; x++) {
                    if (s.charCodeAt(x) == c) {
                        a.push(s.slice(j + 1, x));
                        i = j = x + 1;
                        continue loop;
                    };
                }

                const v = s.slice(i - 3 < 0 ? 0 : i - 3, i + 3);
                throw new Error('Unclosed quotation mark `' + v + '`');
            }

            if (j >= l) {
                if (i <= j) {
                    const c = s.slice(i, j + 1);
                    if (c.length > 0) a.push(c);
                }
                break loop;
            };
            j++;
        }

        return a;
    }

    private isOption(s: string): boolean {
        if (s.charAt(0) != '-') return false;
        return s.slice(1) in this.options;
    }

    public parse(text: string): [ Options, string[] ] {
        let remain = [];
        const a    = this.split(text);
        const l    = a.length;

        loop: for (let i = 0; i < l; i++) {
            let s = a[i];

            if (s.charAt(0) != '-') {
                remain.push(s);
                continue loop;
            }

            const o = this.options[s.slice(1)];
            if (typeof o == 'undefined') {
                throw new Error(`Invalid as an option '${s.slice(1)}'`);
            }

            switch (o.type) {
            case Type.NoArgument:
                o.value = '';
                break;
            case Type.RequiredArgument:
            case Type.OptionalArgument:
                let v = a[i + 1];
                if (typeof v == 'undefined' || this.isOption(v)) {
                    if (o.type == Type.RequiredArgument) {
                        throw new Error(
                            `Required argument 'option -${o.name}'`);
                    }
                    o.value = '';
                    continue loop;
                }
                o.value = v;
                i++;
                break;
            }
        }

        return [ this.options, remain ];
    }
}