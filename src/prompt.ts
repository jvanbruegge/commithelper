import * as inquirer from 'inquirer';
import { QuestionCollection, Separator, Answers } from 'inquirer';
import { green, red } from 'chalk';

import { Config } from './config';

export function createCommitMessage(config: Config): Promise<string> {
    const questions: QuestionCollection = [
        {
            type: 'list',
            name: 'type',
            message: `Select the type of change that you're committing:`,
            choices: config.types,
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
            name: 'customScope',
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
            type: 'confirm',
            name: 'isBreaking',
            message: 'Are there any breaking changes?',
            default: false,
        },
        {
            type: 'list',
            name: 'type',
            message: `A BREAKING CHANGE is only allowed for the types ${config.allowBreakingChanges.join(
                ', '
            )}, please choose a different type:\n`,
            choices: config.allowBreakingChanges,
            when: answers =>
                config.allowBreakingChanges.indexOf(answers.type) === -1,
        },
        {
            type: 'input',
            name: 'body',
            message:
                'A BREAKING CHANGE commit requires a body. Please enter a longer description of the commit itself:\n',
            when: answers =>
                config.breakingRequiresBody &&
                (answers.body?.length ?? 0) === 0,
            validate: body =>
                body.trim().length > 0 ||
                'Body is required for BREAKING CHANGE',
        },
        {
            type: 'input',
            name: 'breaking',
            message: 'Describe the breaking changes:\n',
            when: answers => answers.isBreaking,
        },
        {
            type: 'input',
            name: 'issuesClosed',
            default: '',
            message:
                `Add issues that are closed by this commit, comma seperated\n` +
                `  (e.g. ${config.ticketNumberPrefix}123, ${config.ticketNumberPrefix}254): (press enter to skip)\n`,
            when: config.skipQuestions.indexOf('issuesClosed') === -1,
            validate: (input: string) => {
                if (input.trim() === '') return true;
                const tickets = input.trim().split(/,/g);
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

    return inquirer.prompt(questions).then(answers => {
        console.log(answers);
        return '';
    });
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

function getChoices(config: Config): (answers: Answers) => string[] {
    return ({ type }) =>
        config.scopes
            .concat(config.scopeOverrides[type] ?? [])
            .concat(
                config.allowCustomScopes
                    ? [(new Separator() as unknown) as string, 'custom']
                    : []
            );
}
