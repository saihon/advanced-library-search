import rewire from 'rewire';
import {epochTime, matcher} from './matcher';

const __local__ = rewire('./matcher.ts');
const compiler  = __local__.__get__('compiler');

describe.each([
    [ `*`, `.*` ],
    [ `(`, `\\(` ],
    [ `)`, `\\)` ],
    [ `/`, `\\/` ],
    [ `+`, `\\+` ],
    [ `.`, `\\.` ],
    [ `?`, `\\?` ],
    [ `{`, `\\{` ],
    [ `}`, `\\}` ],
    [ `[`, `\\[` ],
    [ `]`, `\\]` ],
    [ `^`, `\\^` ],
    [ `$`, `\\$` ],
    [ `-`, `\\-` ],
    [ `|`, `\\|` ],
])('compiler.escape(%s)', (char, expected) => {
    test('Should escape text as intended', () => {
        expect(compiler.escape(char)).toEqual(expected);
    });
});

describe.each([
    [ `?`, `.` ],

    [ `[`, `[` ],         [ `]`, `\\]` ],           [ `[]`, `[]` ],
    [ `[0-9]`, `[0-9]` ], [ `[^a-z]`, `[\\^a-z]` ],

    [ `*`, `[^/]*` ],     [ `**`, `.*` ],           [ `****`, `.*.*` ],

    [ `(`, `\\(` ],       [ `)`, `\\)` ],           [ `/`, `\\/` ],
    [ `+`, `\\+` ],       [ `.`, `\\.` ],           [ `{`, `\\{` ],
    [ `}`, `\\}` ],       [ `^`, `\\^` ],           [ `$`, `\\$` ],
    [ `-`, `\\-` ],       [ `|`, `\\|` ],
])('compiler.glob.escape(%s)', (str, expected) => {
    test('Should glob escape as intended', () => {
        expect(compiler.glob.escape(str)).toEqual(expected);
    });
});

describe.each([
    '',
    '-',
    'hello',
    'hello-world',
])('epochTime.parse(%s)', (s) => {
    test('Should throw an error: Invalid Date', () => {
        expect(() => epochTime.parse(s)).toThrow();
    });
});

describe.each([
    [ `2022`, {start : 1640995200000, end : -1, type : epochTime.Type.AFTER} ],
    [
        `2022/1/1`,
        {start : 1640962800000, end : -1, type : epochTime.Type.AFTER}
    ],
    [ `2022-`, {start : 1640995200000, end : -1, type : epochTime.Type.AFTER} ],
    [
        `2022/1/1-`,
        {start : 1640962800000, end : -1, type : epochTime.Type.AFTER}
    ],
    [
        `-2022`,
        {start : -1, end : 1640995200000, type : epochTime.Type.BEFORE}
    ],
    [
        `-2022/1/1`,
        {start : -1, end : 1640962800000, type : epochTime.Type.BEFORE}
    ],
    [
        `2021-2022`,
        {
            start : 1609459200000,
            end : 1640995200000,
            type : epochTime.Type.BETWEEN
        }
    ],
    [
        `2021/1/1-2022/1/1`,
        {
            start : 1609426800000,
            end : 1640962800000,
            type : epochTime.Type.BETWEEN
        }
    ],
])('epochTime.parse(%s)', (s, expected) => {
    test('Should parse text as intended', () => {
        const actual = epochTime.parse(s);
        expect(actual).toEqual(expected);
    });
});

describe.each([
    [ {text : 'foo'}, {title : 'foo bar baz'}, true ],
    [ {text : 'bar'}, {title : 'foo bar baz'}, true ],
    [ {text : 'baz'}, {title : 'foo bar baz'}, true ],
    [ {text : 'foo bar'}, {title : 'foo bar baz'}, true ],
    [ {text : 'foo bar baz'}, {title : 'foo bar baz'}, true ],
    [ {text : 'hello baz'}, {title : 'foo bar baz'}, true ],
    [ {text : '*'}, {title : 'foo bar baz'}, true ],
    [ {text : 'f*'}, {title : 'foo bar baz'}, true ],
    [ {text : 'b*z'}, {title : 'foo bar baz'}, true ],
    [ {text : 'not matched'}, {title : 'foo bar baz'}, false ],
    [ {text : 'hello*baz'}, {title : 'foo bar baz'}, false ],
])('matcher.Title.match(%s)', (config, object, expected) => {
    test('', () => {
        const m      = (new matcher.Title).init(config);
        const actual = m.match(object);
        expect(actual).toEqual(expected);
    });
});

describe.each([
    [ {text : 'index'}, {rawurl : 'https://example.com/index.html'}, true ],
    [ {text : '*.html'}, {rawurl : 'https://example.com/index.html'}, true ],
    [
        {text : 'google html'},
        {rawurl : 'https://example.com/index.html'},
        true
    ],
    [ {text : 'google'}, {rawurl : 'https://example.com/index.html'}, false ],
    [
        {text : 'foo*.html'},
        {rawurl : 'https://example.com/index.html'},
        false
    ],
])('matcher.Url.match(%s)', (config, object, expected) => {
    test('', () => {
        const m      = (new matcher.Url).init(config);
        const actual = m.match(object);
        expect(actual).toEqual(expected);
    });
});

describe.each([
    [
        {text : 'example'},
        {title : 'foo bar baz', rawurl : 'https://example.com/index.html'},
        true
    ],
    [
        {text : 'foo'},
        {title : 'foo bar baz', rawurl : 'https://example.com/index.html'},
        true
    ],
    [
        {text : 'hello *.html'},
        {title : 'foo bar baz', rawurl : 'https://example.com/index.html'},
        true
    ],
    [
        {text : 'foo*.html'},
        {title : 'foo bar baz', rawurl : 'https://example.com/index.html'},
        false
    ],
    [
        {text : 'example*baz'},
        {title : 'foo bar baz', rawurl : 'https://example.com/index.html'},
        false
    ],
])('matcher.Query.match(%s)', (config, object, expected) => {
    test('', () => {
        const m      = (new matcher.Query).init(config);
        const actual = m.match(object);
        expect(actual).toEqual(expected);
    });
});

describe.each([
    [ {text : '/foo/bar/baz'}, {path : '/foo/bar/baz'}, true ],

    [ {text : '/*/bar/baz'}, {path : '/foo/bar/baz'}, true ],
    [ {text : '/*/*/baz'}, {path : '/foo/bar/baz'}, true ],
    [ {text : '/foo/*/baz'}, {path : '/foo/bar/baz'}, true ],
    [ {text : '/foo/bar/*'}, {path : '/foo/bar/baz'}, true ],
    [ {text : '/foo/bar/*z'}, {path : '/foo/bar/baz'}, true ],

    [ {text : '**'}, {path : '/foo/bar/baz'}, true ],
    [ {text : '/foo**'}, {path : '/foo/bar/baz'}, true ],
    [ {text : '/foo/**'}, {path : '/foo/bar/baz'}, true ],
    [ {text : '/foo/**/baz'}, {path : '/foo/bar/baz'}, true ],
    [ {text : '**/baz'}, {path : '/foo/bar/baz'}, true ],
    [ {text : '/**/baz'}, {path : '/foo/bar/baz'}, true ],
    [ {text : '/foo/bar/**'}, {path : '/foo/bar/baz'}, true ],
    [ {text : '**baz'}, {path : '/foo/bar/baz'}, true ],

    [ {text : '/hell?'}, {path : '/hello'}, true ],
    [ {text : '/hello-[0-9]'}, {path : '/hello-3'}, true ],

    [ {text : '/foo/bar/baz/'}, {path : '/foo/bar/baz'}, false ],
    [ {text : 'baz'}, {path : '/foo/bar/baz'}, false ],
    [ {text : '/foo/'}, {path : '/foo/bar/baz'}, false ],
    [ {text : '/foo/*'}, {path : '/foo/bar/baz'}, false ],
    [ {text : '/foo/bar/'}, {path : '/foo/bar/baz'}, false ],
    [ {text : '/*/baz'}, {path : '/foo/bar/baz'}, false ],
    [ {text : '**/hello/**'}, {path : '/foo/bar/baz'}, false ],
    [ {text : '/foo/**/hello'}, {path : '/foo/bar/baz'}, false ],

])('matcher.Path.match(%s)', (config, object, expected) => {
    test('', () => {
        const m      = (new matcher.Path).init(config);
        const actual = m.match(object);
        expect(actual).toEqual(expected);
    });
});

describe.each([
    [ {text : '2022/1/1'}, {dateTime : 1672498800000 /* 2023/01/01 */}, true ],
    [ {text : '-2022/1/1'}, {dateTime : 1609426800000 /* 2021/01/01 */}, true ],
    [
        {text : '2021/1/1-2023/1/1'},
        {dateTime : 1640962800000 /* 2022/01/01 */},
        true
    ],

    [ {text : '2023/1/1'}, {dateTime : 1640962800000 /* 2022/01/01 */}, false ],
    [
        {text : '-2022/1/1'},
        {dateTime : 1672498800000 /* 2023/01/01 */},
        false
    ],
    [
        {text : '2021/1/1-2023/1/1'},
        {dateTime : 1704034800000 /* 2024/01/01 */},
        false
    ],
])('matcher.Date.match(%s)', (config, object, expected) => {
    test('', () => {
        const m      = (new matcher.Date).init(config);
        const actual = m.match(object);
        expect(actual).toEqual(expected);
    });
});

describe.each([
    [ {text : '1'}, {visitCount : 2}, true ],
    [ {text : '2'}, {visitCount : 2}, true ],
    [ {text : '-2'}, {visitCount : 2}, true ],
    [ {text : '-2'}, {visitCount : 1}, true ],

    [ {text : '3'}, {visitCount : 2}, false ],
    [ {text : '-2'}, {visitCount : 3}, false ],
])('matcher.Visits.match(%s)', (config, object, expected) => {
    test('', () => {
        const m      = (new matcher.Visits).init(config);
        const actual = m.match(object);
        expect(actual).toEqual(expected);
    });
});
