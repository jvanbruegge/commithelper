import * as t from 'io-ts';
import { PathReporter } from 'io-ts/PathReporter';
import { fold } from 'fp-ts/Either';
import { readFileSync } from 'fs';
import { withDefault } from './withDefault';

const Config = t.type({
    subjectLimit: withDefault(t.number, 100),
    subjectSeperator: withDefault(t.string, ':'),
    typePrefix: withDefault(t.string, ''),
    typeSuffix: withDefault(t.string, ''),
    types: withDefault(t.array(t.string), ['feat', 'fix', 'release', 'chore']),
    scopes: withDefault(t.array(t.string), []),
    scopeOverrides: withDefault(t.record(t.string, t.array(t.string)), {}),
    allowCustomScopes: withDefault(t.boolean, false),
    ticketPrefix: withDefault(t.string, 'ISSUES CLOSED:'),
    breakingPrefix: withDefault(t.string, 'BREAKING CHANGE:'),
});

export type Config = t.TypeOf<typeof Config>;

export function parseConfig(path: string | undefined): Config {
    const json = path
        ? JSON.parse(readFileSync(path, { encoding: 'utf-8' }))
        : {};
    const parsed = Config.decode(json);
    const onLeft = (): never => {
        throw new Error(PathReporter.report(parsed).join('\n'));
    };
    return fold(onLeft, (x: Config) => x)(parsed);
}
