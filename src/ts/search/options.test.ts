
import {Option, Parser, Type} from './option';

describe.each([
    `'hello world`,
    `"hello world`,
    `hello'world`,
    `hello"world`,
    `hello world'`,
    `hello world"`,
])('.split(%s)', (text) => {
    test('Should throw an error: Unclosed quotation', () => {
        expect(() => (new Parser())['split'](text)).toThrow();
    });
});

describe.each([
    [ ``, [] ],

    [ `a`, [ `a` ] ],
    [ ` a`, [ `a` ] ],
    [ `a `, [ `a` ] ],

    [ `foo bar baz`, [ `foo`, `bar`, `baz` ] ],
    [ `  foo  bar  baz  `, [ `foo`, `bar`, `baz` ] ],

    [ `'' bar baz`, [ ``, `bar`, `baz` ] ],
    [ `foo '' baz`, [ `foo`, ``, `baz` ] ],
    [ `foo bar ''`, [ `foo`, `bar`, `` ] ],
    [ `' ' bar baz`, [ ` `, `bar`, `baz` ] ],
    [ `foo ' ' baz`, [ `foo`, ` `, `baz` ] ],
    [ `foo bar ' '`, [ `foo`, `bar`, ` ` ] ],

    [ `"it's show time"`, [ `it's show time` ] ],
    [ `"it's" "show time"`, [ `it's`, `show time` ] ],
    [ `"it's" show time`, [ `it's`, `show`, `time` ] ],
    [ `'it"s' show time`, [ `it"s`, `show`, `time` ] ],
])('.split(%s)', (text, expected) => {
    test('Should split as intended', () => {
        const actual = (new Parser())['split'](text);
        expect(actual).toEqual(expected);
    });
});

describe.each([
    [ `-a`, true ],
    [ `-b`, true ],
    [ `-c`, true ],
    [ `-abc`, false ],
    [ `-aaa`, false ],
    [ `-`, false ],
    [ `hello`, false ],
])('.isOption(%s)', (s, expected) => {
    test(`Should return ${expected}`, () => {
        const options = [
            new Option('a', Type.NoArgument),
            new Option('b', Type.NoArgument),
            new Option('c', Type.NoArgument),
        ];
        const actual = (new Parser(...options))['isOption'](s);
        expect(actual).toEqual(expected);
    });
});

describe.each([
    [ `-a`, [], 'option has not been set' ],
    [ `-a`, [ new Option('a', Type.RequiredArgument) ], 'required argument' ],
])('.parse(%s)', (args, opts, name) => {
    test(`Should exception has occurred: ${name}`, () => {
        expect(() => (new Parser(...opts)).parse(args)).toThrow();
    });
});

describe.each([
    [ ``, [], [] ],
    [ `foo bar baz`, [], [ 'foo', 'bar', 'baz' ] ],
    // no argument
    [ `-a`, [ new Option('a', Type.NoArgument) ], [] ],
    [
        `-a foo bar baz`,
        [ new Option('a', Type.NoArgument) ],
        [ 'foo', 'bar', 'baz' ]
    ],
    [
        `foo -a bar baz`,
        [ new Option('a', Type.NoArgument) ],
        [ 'foo', 'bar', 'baz' ]
    ],
    [
        `foo bar -a baz`,
        [ new Option('a', Type.NoArgument) ],
        [ 'foo', 'bar', 'baz' ]
    ],
    [
        `foo bar baz -a`,
        [ new Option('a', Type.NoArgument) ],
        [ 'foo', 'bar', 'baz' ]
    ],
    // optional argument
    [ `-a`, [ new Option('a', Type.OptionalArgument) ], [] ],
    [
        `-a hello foo bar baz`,
        [ new Option('a', Type.OptionalArgument) ],
        [ 'foo', 'bar', 'baz' ]
    ],
    [
        `foo -a hello bar baz`,
        [ new Option('a', Type.OptionalArgument) ],
        [ 'foo', 'bar', 'baz' ]
    ],
    [
        `foo bar -a hello baz`,
        [ new Option('a', Type.OptionalArgument) ],
        [ 'foo', 'bar', 'baz' ]
    ],
    [
        `foo bar baz -a hello`,
        [ new Option('a', Type.OptionalArgument) ],
        [ 'foo', 'bar', 'baz' ]
    ],
    [
        `foo bar baz -a`,
        [ new Option('a', Type.OptionalArgument) ],
        [ 'foo', 'bar', 'baz' ]
    ],
    // required argument
    [ `-a hello`, [ new Option('a', Type.RequiredArgument) ], [] ],
    [
        `-a hello foo bar baz`,
        [ new Option('a', Type.RequiredArgument) ],
        [ 'foo', 'bar', 'baz' ]
    ],
    [
        `foo -a hello bar baz`,
        [ new Option('a', Type.RequiredArgument) ],
        [ 'foo', 'bar', 'baz' ]
    ],
    [
        `foo bar -a hello baz`,
        [ new Option('a', Type.RequiredArgument) ],
        [ 'foo', 'bar', 'baz' ]
    ],
    [
        `foo bar baz -a hello`,
        [ new Option('a', Type.RequiredArgument) ],
        [ 'foo', 'bar', 'baz' ]
    ],
    [
        `-a hello -b world foo bar baz`,
        [
            new Option('a', Type.RequiredArgument),
            new Option('b', Type.RequiredArgument)
        ],
        [ 'foo', 'bar', 'baz' ]
    ],
    [
        `foo -a hello -b world bar baz`,
        [
            new Option('a', Type.RequiredArgument),
            new Option('b', Type.RequiredArgument)
        ],
        [ 'foo', 'bar', 'baz' ]
    ],
    [
        `foo -a hello bar -b world baz`,
        [
            new Option('a', Type.RequiredArgument),
            new Option('b', Type.RequiredArgument)
        ],
        [ 'foo', 'bar', 'baz' ]
    ],
    [
        `foo bar -a hello baz -b world`,
        [
            new Option('a', Type.RequiredArgument),
            new Option('b', Type.RequiredArgument)
        ],
        [ 'foo', 'bar', 'baz' ]
    ],
])('.parse(%s)', (args, opts, expected) => {
    test(`Test option type and return remaining arguments: [${expected}]`,
         () => {
             const [_, actual] = (new Parser(...opts)).parse(args);
             expect(actual).toEqual(expected);
         });
});

describe.each([
    [ `-a foo bar baz`, [ new Option('a', Type.NoArgument) ], 'a', '' ],
    [ `foo bar baz -a`, [ new Option('a', Type.NoArgument) ], 'a', '' ],
    [
        `-a foo bar baz`,
        [ new Option('a', Type.RequiredArgument) ],
        'a',
        'foo'
    ],
    [
        `foo -a bar baz`,
        [ new Option('a', Type.RequiredArgument) ],
        'a',
        'bar'
    ],
    [
        `foo bar -a baz`,
        [ new Option('a', Type.RequiredArgument) ],
        'a',
        'baz'
    ],
    [
        `-a foo bar baz`,
        [ new Option('a', Type.OptionalArgument) ],
        'a',
        'foo'
    ],
    [
        `foo bar -a baz`,
        [ new Option('a', Type.OptionalArgument) ],
        'a',
        'baz'
    ],
    [ `foo bar baz -a`, [ new Option('a', Type.OptionalArgument) ], 'a', '' ],
])('.parse(%s)', (args, opts, name, expected) => {
    test(`Test assign to option.value (each option type)`, () => {
        const [options, _] = (new Parser(...opts)).parse(args);
        expect(options[name].value).toEqual(expected);
    });
});
