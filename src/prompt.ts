import * as inquirer from 'inquirer';
import {
    QuestionCollection,
    Separator,
    Answers,
    ChoiceCollection,
} from 'inquirer';
import { green, red } from 'chalk';

import {
    Config,
    Type,
    getScopes,
    ticketSeperatorRegex,
    getMessage,
    getName,
} from './config';
import { Message } from './message';

export function createCommitMessage(config: Config): Promise<Message> {
    const questions: QuestionCollection = [
        {
            type: 'list',
            name: 'type',
            message: `Select the type of change that you're committing:`,
            choices: getTypes(config.types),
        },
        {
            type: 'list',
            name: 'scope',
            message: `What is the scope of this change (e.g. component or file name):`,
            choices: getChoices(config),
            when: answers => getChoices(config)(answers).length > 0,
        },
        {
            type: 'input',
            name: 'scope',
            askAnswered: true,
            message: 'Enter a custom scope:',
            when: answers => answers.scope === 'custom',
        },
        {
            type: 'input',
            name: 'subject',
            message: answers =>
                `Write a short, imperative tense description of the change (max ${maxSubjectLength(
                    answers,
                    config.subjectLimit
                )} chars):\n`,
            validate: (subject, answers) => {
                const filtered = filterSubject(subject, config.upperCase);
                const length = maxSubjectLength(answers!, config.subjectLimit);
                return filtered.length === 0
                    ? 'subject is required'
                    : filtered.length <= length
                    ? true
                    : `Subject length must be less than or equal to ${length} characters.` +
                      ` Current length is ${filtered.length} characters.`;
            },
            transformer: (subject, answers) => {
                const filtered = filterSubject(subject, config.upperCase);
                const color =
                    filtered.length <=
                    maxSubjectLength(answers, config.subjectLimit)
                        ? green
                        : red;
                return color(`(${filtered.length}) ${subject}`);
            },
            filter: subject => filterSubject(subject, config.upperCase),
        },
        {
            type: 'input',
            name: 'body',
            message:
                'Provide a longer description of the change: (press enter to skip)\n',
            when: config.skipQuestions.indexOf('body') === -1,
        },
        {
            type: 'input',
            name: 'breaking',
            message: 'List any BREAKING CHANGES: (press enter to skip)\n',
            when: config.skipQuestions.indexOf('breaking') === -1,
            transformer: s => s.trim(),
        },

        {
            type: 'list',
            name: 'type',
            message: `A BREAKING CHANGE is only allowed for the types ${config.allowBreakingChanges.join(
                ', '
            )}, please choose a different type:\n`,
            choices: config.allowBreakingChanges,
            when: answers =>
                answers.breaking !== '' &&
                config.allowBreakingChanges.length > 0 &&
                config.allowBreakingChanges.indexOf(answers.type) === -1,
        },
        {
            type: 'input',
            name: 'body',
            message:
                'A BREAKING CHANGE commit requires a body. Please enter a longer description of the commit itself:\n',
            when: answers =>
                answers.breaking !== '' &&
                config.breakingRequiresBody &&
                (answers.body?.length ?? 0) === 0,
            validate: body =>
                body.trim().length > 0 ||
                'Body is required for BREAKING CHANGE',
        },
        {
            type: 'input',
            name: 'issuesClosed',
            default: '',
            message: `List any ISSUES CLOSED by this comit, seperated by '${config.ticketSeperator}'. E.g. ${config.ticketNumberPrefix}123${config.ticketSeperator} ${config.ticketNumberPrefix}254: (press enter to skip)\n`,
            when: config.skipQuestions.indexOf('issuesClosed') === -1,
            validate: (input: string) => {
                if (input.trim() === '') return true;
                const tickets = input
                    .trim()
                    .split(ticketSeperatorRegex(config));
                for (const t of tickets) {
                    const x = t.trim();
                    if (!x.startsWith(config.ticketNumberPrefix)) {
                        return `Expected ticket number to start with '${config.ticketNumberPrefix}', but got '${t}'`;
                    }
                    const num = x.slice(
                        config.ticketNumberPrefix.length,
                        x.length
                    );
                    if (isNaN(parseInt(num))) {
                        return `Expected ticket number to be a number, got '${num}' ('${t}')`;
                    }
                }
                return true;
            },
        },
    ];

    return inquirer.prompt(questions).then(answers => answers as Message);
}

function maxSubjectLength(answers: Answers, subjectLimit: number): number {
    const scopeLength = answers.scope?.length ?? 0;
    const x = scopeLength === 0 ? 0 : 2;
    return subjectLimit - answers.type.length - scopeLength - x - 1;
}

function filterSubject(subject: string, upperCase: boolean): string {
    let x = subject.slice();
    x.trim();
    x =
        (upperCase ? x.charAt(0).toUpperCase() : x.charAt(0).toLowerCase()) +
        x.slice(1);
    while (x.endsWith('.')) {
        x = x.slice(0, x.length - 1);
    }
    return x;
}

function getChoices(config: Config): (answers: Answers) => ChoiceCollection {
    return ({ type }) => {
        const scopes = getScopes(type, config);
        return getTypes(scopes).concat(
            config.allowCustomScopes
                ? [(new Separator() as unknown) as string, 'custom']
                : []
        );
    };
}

function getTypes(types: Type[]): ChoiceCollection {
    const maxLength = getMaxNameLength(types);
    return types.map(t => {
        const name = getName(t);
        const message = getMessage(t);
        return {
            value: name,
            name:
                name +
                (message ? ': ' : '') +
                ' '.repeat(maxLength - name.length) +
                message,
        };
    });
}

function getMaxNameLength(types: Type[]): number {
    return types.reduce((acc, curr) => {
        const currLength = getName(curr).length;
        return acc >= currLength ? acc : currLength;
    }, 0);
}
