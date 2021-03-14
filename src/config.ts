import * as t from 'io-ts';
import { PathReporter } from 'io-ts/PathReporter';
import { fold } from 'fp-ts/Either';
import { readFileSync } from 'fs';
import { join } from 'path';
import { withDefault } from './withDefault';

const skippable = t.keyof({
    body: null,
    breaking: null,
    issuesClosed: null,
});

const Type = t.type({
    name: t.string,
    message: t.string,
});

export type Type = t.TypeOf<typeof Type>;

const defaultTypes: Type[] = [
    { name: 'feat', message: 'A new feature' },
    { name: 'fix', message: 'A bug fix' },
    {
        name: 'chore',
        message:
            'Changes internal to the package, e.g. tooling, documentation, examples etc',
    },
];

const Config = t.type({
    subjectLimit: withDefault(t.number, 100),
    subjectSeperator: withDefault(t.string, ':'),
    typePrefix: withDefault(t.string, ''),
    typeSuffix: withDefault(t.string, ''),
    types: withDefault(t.array(Type), defaultTypes),
    scopes: withDefault(t.array(t.string), []),
    scopeOverrides: withDefault(t.record(t.string, t.array(t.string)), {}),
    allowCustomScopes: withDefault(t.boolean, false),
    bodyWrap: withDefault(t.number, 72),
    ticketPrefix: withDefault(t.string, 'ISSUES CLOSED:'),
    ticketNumberPrefix: withDefault(t.string, '#'),
    ticketSeperator: withDefault(t.string, ','),
    breakingPrefix: withDefault(t.string, 'BREAKING CHANGE:'),
    breakingRequiresBody: withDefault(t.boolean, false),
    allowBreakingChanges: withDefault(t.array(t.string), ['feat', 'fix']),
    upperCase: withDefault(t.boolean, false),
    skipQuestions: withDefault(t.array(skippable), []),
});

export type Config = t.TypeOf<typeof Config>;

export function getScopes(type: string, config: Config): string[] {
    return config.scopeOverrides[type] ?? config.scopes;
}

export function parseConfigFile(path: string | undefined): Config {
    const json = path
        ? JSON.parse(readFileSync(path, { encoding: 'utf-8' }))
        : JSON.parse(
              readFileSync(join(process.cwd(), 'package.json'), {
                  encoding: 'utf-8',
              })
          ).commithelper || {};
    return parseConfig(json);
}

export function parseConfig(config: Partial<Config>): Config {
    const parsed = Config.decode(config);
    const onLeft = (): never => {
        throw new Error(PathReporter.report(parsed).join('\n'));
    };
    return fold(onLeft, (x: Config) => x)(parsed);
}

export function ticketSeperatorRegex(config: Config): RegExp {
    return new RegExp(`${escapeRegex(config.ticketSeperator)}`, 'g');
}

export function escapeRegex(str: string): string {
    // From [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#escaping)
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
