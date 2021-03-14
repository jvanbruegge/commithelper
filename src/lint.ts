import { Config, getScopes, ticketSeperatorRegex } from './config';
import { Message } from './message';

export function checkMessage(msg: Message, config: Config): void {
    if (config.types.indexOf(msg.type) === -1) {
        throw new Error(
            `Expected 'type' to be one of '${config.types.join(', ')}', got '${
                msg.type
            }'`
        );
    }

    const allowedScopes = getScopes(msg.type, config);
    if (allowedScopes.length > 0 && !msg.scope) {
        throw new Error('Expected a scope, but got none');
    }

    if (
        msg.scope &&
        !config.allowCustomScopes &&
        allowedScopes.indexOf(msg.scope) === -1
    ) {
        throw new Error(
            `Expected 'scope' to be one of '${allowedScopes.join(
                ', '
            )}', got '${msg.scope}'`
        );
    }

    if (msg.body) {
        checkWrap(msg.body, config.bodyWrap);
    }
    if (msg.breaking) {
        if (
            config.allowBreakingChanges.length > 0 &&
            config.allowBreakingChanges.indexOf(msg.type) === -1
        ) {
            throw new Error(
                `A BREAKING CHANGE is only allowed for the types '${config.allowBreakingChanges.join(
                    ', '
                )}', not for '${msg.type}'`
            );
        }
        checkWrap(msg.breaking, config.bodyWrap);
    }

    if (msg.issuesClosed) {
        for (const issue of msg.issuesClosed
            .split(ticketSeperatorRegex(config))
            .map(s => s.trim())) {
            if (!issue.startsWith(config.ticketNumberPrefix)) {
                throw new Error(
                    `Expected ticket number to start with '${config.ticketNumberPrefix}', got '${issue}'`
                );
            }
            const ticketNumber = issue.slice(
                config.ticketNumberPrefix.length,
                issue.length
            );
            if (isNaN(parseInt(ticketNumber))) {
                throw new Error(
                    `Expected ticket number to be a number, got '${ticketNumber}'`
                );
            }
        }
    }
}

function checkWrap(block: string, wrap: number) {
    for (const line of block.split('\n')) {
        if (line.length > wrap) {
            throw new Error(
                `Expected body to wrap after ${wrap} characters, but '${line}' has ${line.length}`
            );
        }
    }
}
