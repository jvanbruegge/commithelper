import * as t from 'io-ts';
import { PathReporter } from 'io-ts/PathReporter';
import { fold } from 'fp-ts/Either';
import { readFileSync } from 'fs';
import { join } from 'path';
import { withDefault } from './withDefault';

const skippable = t.keyof({
    body: null,
    isBreaking: null,
    issuesClosed: null,
});

const Config = t.type({
    subjectLimit: withDefault(t.number, 100),
    subjectSeperator: withDefault(t.string, ':'),
    typePrefix: withDefault(t.string, ''),
    typeSuffix: withDefault(t.string, ''),
    types: withDefault(t.array(t.string), ['feat', 'fix', 'release', 'chore']),
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

export function parseConfig(path: string | undefined): Config {
    const json = path
        ? JSON.parse(readFileSync(path, { encoding: 'utf-8' }))
        : JSON.parse(
              readFileSync(join(process.cwd(), 'package.json'), {
                  encoding: 'utf-8',
              })
          ).commithelper || {};
    const parsed = Config.decode(json);
    const onLeft = (): never => {
        throw new Error(PathReporter.report(parsed).join('\n'));
    };
    return fold(onLeft, (x: Config) => x)(parsed);
}

export function ticketSeperatorRegex(config: Config): RegExp {
    return new RegExp(`/${escapeRegex(config.ticketSeperator)}/`, 'g');
}

export function escapeRegex(str: string): string {
    // From [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#escaping)
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
