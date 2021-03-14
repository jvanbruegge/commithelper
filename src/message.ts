import { Config, ticketSeperatorRegex, escapeRegex } from './config';

export interface Message {
    type: string;
    scope?: string;
    subject: string;
    body?: string;
    breaking?: string;
    issuesClosed?: string;
}

export function parseMessage(msg: string, config: Config): Message {
    const lines = msg.split('\n').filter(Boolean);

    const subjectLineRegex = new RegExp(
        `^${escapeRegex(config.typePrefix)}([^()]+)${escapeRegex(
            config.typeSuffix
        )}(?:\\(([^()]+)\\))?: (.*)$`
    );

    const matches = lines[0].match(subjectLineRegex);
    if (!matches) {
        throw new Error(
            `expected subject to either have form '${config.typePrefix}<type>${config.typeSuffix}: <subject>' ` +
                `or form '${config.typeSuffix}<type>${config.typeSuffix}(<scope>): <subject>', got '${lines[0]}'`
        );
    }

    const [_, type, scope, subject] = matches;

    let isBody = true;
    let body = '';
    let issuesClosed = '';
    let breaking = '';
    for (let i = 1; i < lines.length; i++) {
        if (lines[i].startsWith('#')) {
            continue;
        }
        if (lines[i].startsWith(config.ticketPrefix)) {
            issuesClosed +=
                (issuesClosed ? `${config.ticketSeperator} ` : '') +
                lines[i]
                    .slice(config.ticketPrefix.length, lines[i].length)
                    .split(config.ticketSeperator)
                    .map(s => s.trim())
                    .join(config.ticketSeperator + ' ');
        } else if (lines[i].startsWith(config.breakingPrefix)) {
            isBody = false;
        } else if (isBody) {
            body += lines[i] + '\n';
        } else {
            breaking += lines[i] + '\n';
        }
    }

    return {
        type,
        scope,
        subject,
        body: body.trim(),
        breaking: breaking.trim(),
        issuesClosed: issuesClosed.trim(),
    };
}

export function renderMessage(msg: Message, config: Config): string {
    const scope = msg.scope ? `(${msg.scope})` : '';

    const header =
        config.typePrefix +
        msg.type +
        config.typeSuffix +
        scope +
        ': ' +
        msg.subject;

    const body = msg.body ? '\n\n' + renderBody(msg.body, config) : '';

    const issues = msg.issuesClosed
        ? '\n\n' + renderIssuesClosed(msg.issuesClosed, config)
        : '';
    const breaking = msg.breaking
        ? (msg.issuesClosed ? '\n' : '\n\n') +
          config.breakingPrefix +
          '\n' +
          renderBody(msg.breaking!, config)
        : '';

    const footer = msg.issuesClosed || msg.breaking ? issues + breaking : '';

    return header + body + footer;
}

function renderBody(bodyMsg: string, config: Config): string {
    const words = bodyMsg.split(/ |\n/g).filter(Boolean);

    let lineLength = 0;
    let s = '';
    for (const word of words) {
        if (lineLength + word.length + 1 > config.bodyWrap) {
            s += '\n' + word;
            lineLength = word.length;
        } else {
            s += ' ' + word;
            lineLength += 1 + word.length;
        }
    }
    return s.trim();
}

function renderIssuesClosed(issuesMsg: string, config: Config): string {
    const issues = issuesMsg
        .split(ticketSeperatorRegex(config))
        .map(s => s.trim());

    let s = config.ticketPrefix + ' ' + issues[0];
    let lineLength = s.length;

    for (let i = 1; i < issues.length; i++) {
        if (lineLength + 2 + issues[i].length > config.bodyWrap) {
            const newLine = `${config.ticketPrefix} ${issues[i]}`;
            s += '\n' + newLine;
            lineLength = newLine.length;
        } else {
            const x = `${config.ticketSeperator} ${issues[i]}`;
            s += x;
            lineLength += x.length;
        }
    }
    return s.trim();
}
