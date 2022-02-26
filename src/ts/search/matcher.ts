import {creator} from "./creator";

namespace compiler {

const pattern: RegExp =
    new RegExp(/\(|\)|\/|\*|\+|\.|\?|\{|\}|\[|\]|\^|\$|\-|\||\\/g);

const replacer = (c: string): string => {
    // asterisks return as wildcards
    if (c == '*') {
        return '.*';
    }
    return '\\' + c;
};

export const escape = (s: string): string => {
    return s.replace(pattern, replacer);
};

export namespace glob {
const pattern: RegExp =
    new RegExp(/\(|\)|\/|\*|\+|\.|\?|\{|\}|\[|\]|\^|\$|\-|\||\\/g);

let squareBrackets = false;
const replacer = (c: string): string => {
    if (squareBrackets) {
        if (c == '^') {
            return '\\' + c;
        }
        if (c == ']') {
            squareBrackets = false;
        }
        return c;
    }
    if (c == '[') {
        squareBrackets = true;
        return c;
    }
    if (c == '*') {
        return '[^/]*';
    }
    // ? is one character that exists, so not a .?
    if (c == '?') {
        return '.';
    }
    return '\\' + c;
};

// ** is eventually replaced by .*
// in ** ===> [^/]*[^/]* ===> .* out
const stars: RegExp = new RegExp(/\[\^\/\]\*\[\^\/\]\*/g);
export const escape = (s: string): string => {
    squareBrackets = false;
    return s.replace(pattern, replacer).replace(stars, '.*');
}
}

export const compile = (config: matcher.Config): RegExp[] => {
    if (!config.regexp) {
        config.regexp = {enabled : false, flags : ''};
    }
    if (config.regexp.enabled) {
        return [ new RegExp(config.text, config.regexp.flags) ];
    }

    const a           = escape(config.text).split(/\s+/, -1);
    const l           = a.length;
    const r: RegExp[] = new Array(l);
    for (let i = 0; i < l; i++) {
        r[i] = new RegExp(a[i], 'i');
    }
    return r;
}
}

export namespace epochTime {
/*
 * IETF-Compliant RFC 2822 Timestamp
 * https://datatracker.ietf.org/doc/html/rfc2822#page-14
 *  However, hyphens are not allowed as the delimiter.
 */

export enum Type {
    BEFORE = 1,
    AFTER,
    BETWEEN,
}

export type Object = {
    start: number,
    end: number,
    type: Type,
};

const isInvalidDate = (d: Date): boolean => {
    return d.toString() == 'Invalid Date';
};

export const parse = (s: string): epochTime.Object => {
    const o: epochTime.Object = {
        start : -1,
        end : -1,
        type : 0,
    };

    // -2022/1/1         until 2022/1/1
    // 2022/1/1          after 2022/1/1
    // 2022/1/1-         after 2022/1/1
    // 2021/1/1-2022/1/1 between 2021/1/1 and 2022/1/1
    const a = s.split('-');
    switch (a.length) {
    case 1:
        const d = new Date(a[0]);
        if (isInvalidDate(d)) {
            throw new Error(`Invalid Date: '${s}'`);
        }
        o.type  = epochTime.Type.AFTER;
        o.start = d.getTime();
        break;
    case 2:
        if (a[0] == '') {
            const d = new Date(a[1]);
            if (isInvalidDate(d)) {
                throw new Error(`Invalid Date: '${s}'`);
            }
            o.type = epochTime.Type.BEFORE;
            o.end  = d.getTime();
        } else if (a[1] == '') {
            const d = new Date(a[0]);
            if (isInvalidDate(d)) {
                throw new Error(`Invalid Date: '${s}'`);
            }
            o.type  = epochTime.Type.AFTER;
            o.start = d.getTime();
        } else {
            const x = new Date(a[0]);
            const y = new Date(a[1]);
            if (isInvalidDate(x) || isInvalidDate(y)) {
                throw new Error(`Invalid Date: '${s}'`);
            }
            o.type  = epochTime.Type.BETWEEN;
            o.start = x.getTime();
            o.end   = y.getTime();
        }
        break;
    }

    return o;
}
}

export namespace matcher {

export type Object = creator.Object;

export type Config = {
    text: string,
    regexp?: {
        enabled: boolean,
        flags: string,
    },
}

export interface Matcher {
    init(config: matcher.Config): matcher.Matcher;
    match(object: matcher.Object): boolean;
}

export class Title implements matcher.Matcher {
    private patterns: RegExp[] = [];
    init(config: matcher.Config): matcher.Matcher {
        if (!config.regexp) config.regexp = {enabled : false, flags : ''};
        this.patterns = compiler.compile(config);
        return this;
    }
    match(object: matcher.Object): boolean {
        if (typeof object.title == 'undefined') return false;
        const title = object.title;
        for (const v of this.patterns) {
            if (v.test(title)) return true;
        }
        return false;
    }
}

export class Url implements matcher.Matcher {
    private patterns: RegExp[] = [];
    init(config: matcher.Config): matcher.Matcher {
        if (!config.regexp) config.regexp = {enabled : false, flags : ''};
        this.patterns = compiler.compile(config);
        return this;
    }
    match(object: matcher.Object): boolean {
        if (typeof object.rawurl == 'undefined') return false;
        const rawurl = object.rawurl;
        for (const v of this.patterns) {
            if (v.test(rawurl)) return true;
        }
        return false;
    }
}

export class Query implements matcher.Matcher {
    private title: matcher.Matcher|undefined;
    private url: matcher.Matcher|undefined;
    init(config: matcher.Config): matcher.Matcher {
        this.title = (new matcher.Title()).init(config);
        this.url   = (new matcher.Url()).init(config);
        return this;
    }
    match(object: matcher.Object): boolean {
        return this.title?.match(object) || this.url?.match(object) || false;
    }
}

// See matcher.Path.match in matcher.test.ts for Matching Specifications
export class Path implements matcher.Matcher {
    private pattern: RegExp|undefined;
    init(config: matcher.Config): matcher.Matcher {
        this.pattern =
            new RegExp('^' + compiler.glob.escape(config.text) + '$', 'i');
        return this;
    }
    match(object: matcher.Object): boolean {
        if (typeof object.path == 'undefined') return false;
        return this.pattern?.test(object.path) || false;
    }
}

export class Date implements matcher.Matcher {
    private epochTime: epochTime.Object|undefined;
    init(config: matcher.Config): matcher.Matcher {
        this.epochTime = epochTime.parse(config.text);
        return this;
    }
    match(object: matcher.Object): boolean {
        if (typeof this.epochTime == 'undefined' ||
            typeof object.dateTime == 'undefined')
            return false;

        const n = object.dateTime;
        switch (this.epochTime.type) {
        case epochTime.Type.BEFORE:
            return n < this.epochTime.end;
        case epochTime.Type.AFTER:
            return n > this.epochTime.start;
        case epochTime.Type.BETWEEN:
            return n > this.epochTime.start && n < this.epochTime.end;
        }
    }
}

export class Visits implements matcher.Matcher {
    private count: number = 0;
    init(config: matcher.Config): matcher.Matcher {
        this.count = parseInt(config.text, 10);
        return this;
    }
    match(object: matcher.Object): boolean {
        if (typeof object.visitCount == 'undefined') return false;
        if (this.count < 0) {
            return object.visitCount <= Math.abs(this.count);
        }
        return object.visitCount >= this.count;
    }
}

export class Transition implements matcher.Matcher {
    private types: string[] = [];
    init(config: matcher.Config): matcher.Matcher {
        const pattern = new RegExp(/\s*,\s*|\s+/);
        this.types =
            config.text.split(pattern, -1).filter(v => {return v != ''});
        return this;
    }
    match(object: matcher.Object): boolean {
        if (typeof object.transition == 'undefined') return false;
        const transition = object.transition;
        for (const v of this.types) {
            if (transition == v) return true;
        }
        return false;
    }
}
}