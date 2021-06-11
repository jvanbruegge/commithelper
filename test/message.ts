import * as fc from 'fast-check';
import * as assert from 'assert';

import { parseConfig } from '../src/config';
import { Message, parseMessage, renderMessage } from '../src/message';

const config = parseConfig({});

const ticketArbitrary = fc
    .array(fc.nat())
    .map(arr =>
        arr
            .map(n => config.ticketNumberPrefix + n)
            .join(config.ticketSeperator + ' ')
    );

const messageArbitrary: fc.Arbitrary<Message> = fc.record({
    type: fc.string({ minLength: 1 }),
    scope: fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
    subject: fc.string({ minLength: 1 }),
    body: fc.option(fc.string(), { nil: undefined }),
    breaking: fc.option(fc.string(), { nil: undefined }),
    issuesClosed: fc.option(ticketArbitrary, { nil: undefined }),
});

describe('message tests', () => {
    it('should be able to parse any rendered commit message', () => {
        fc.assert(
            fc.property(messageArbitrary, fc.context(), (message, ctx) => {
                fc.pre(
                    Boolean(message.type.trim()) &&
                        Boolean(message.subject.trim()) &&
                        !message.type.match(/\(|\)/) &&
                        !(message.scope && message.scope.match(/\(|\)/)) &&
                        !(message.body && message.body.match(/#/)) &&
                        !(message.breaking && message.breaking.match(/#/))
                );

                ctx.log(`Original: ${JSON.stringify(message, null, 2)}`);

                const rendered = renderMessage(message, config);

                ctx.log(`Rendered: ${rendered}`);

                const parsed = parseMessage(rendered, config);

                ctx.log(`Parsed: ${JSON.stringify(parsed, null, 2)}`);

                const newMessage = {
                    ...message,
                    body: message.body
                        ? message.body.trim().split(/ +/g).join(' ')
                        : '',
                    breaking: message.breaking ? message.breaking.trim() : '',
                    issuesClosed: message.issuesClosed
                        ? message.issuesClosed.trim()
                        : '',
                };

                assert.deepStrictEqual(parsed, newMessage);
            })
        );
    });
});
