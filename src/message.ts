import { Config, ticketSeperatorRegex } from './config';

export interface Message {
    type: string;
    scope?: string;
    customScope?: string;
    subject: string;
    body?: string;
    isBreaking: boolean;
    breaking?: string;
    issuesClosed?: string;
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
    const breaking = msg.isBreaking
        ? (msg.issuesClosed ? '\n' : '\n\n') +
          config.breakingPrefix +
          '\n' +
          renderBody(msg.breaking!, config)
        : '';

    const footer = msg.issuesClosed || msg.isBreaking ? issues + breaking : '';

    return header + body + footer;
}

function renderBody(bodyMsg: string, config: Config): string {
    const words = bodyMsg.split(/ /g).filter(Boolean);

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
