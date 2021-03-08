import * as t from 'io-ts';
import { map } from 'fp-ts/Either';

export class WithDefault<
    RT extends t.Any,
    A = any,
    O = A,
    I = unknown
> extends t.Type<A, O, I> {
    readonly _tag: 'WithDefault' = 'WithDefault';
    constructor(
        is: WithDefault<RT, A, O, I>['is'],
        validate: WithDefault<RT, A, O, I>['validate'],
        serialize: WithDefault<RT, A, O, I>['encode'],
        readonly type: RT
    ) {
        super('WithDefault', is, validate, serialize);
    }
}

export const withDefault = <RT extends t.Type<A, O>, A = any, O = A>(
    type: RT,
    defaultValue: t.TypeOf<RT>
): WithDefault<RT, t.TypeOf<RT>, t.OutputOf<RT>, unknown> => {
    const Nullable = t.union([type, t.null, t.undefined]);
    return new WithDefault(
        (m): m is t.TypeOf<RT> => type.is(m),
        (s, c) => {
            const validation = Nullable.validate(s, c);
            return map<any, any>(value => value ?? defaultValue)(validation);
        },
        a => type.encode(a),
        type
    );
};
