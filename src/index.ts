import { Command, Option } from 'commander';
import { readFileSync, writeFileSync, promises } from 'fs';
import { resolve } from 'path';

import { parseConfig } from './config';
import { createCommitMessage } from './prompt';
import { checkMessage } from './lint';
import { renderMessage, parseMessage } from './message';

const program = new Command();

const pkgJson = JSON.parse(
    readFileSync(resolve(__dirname, '..', 'package.json'), {
        encoding: 'utf-8',
    })
);

process.exitCode = 1;

const configOption = new Option(
    '-c, --config <file>',
    'the path to the commithelper config file'
);
const fileOption = new Option(
    '-f, --file <file>',
    'the path to the file containing the commit message'
);

const checkCommand = new Command('check')
    .description('lint a commit message according to the configuration')
    .addOption(configOption)
    .addOption(fileOption)
    .option('--fix', 'Try to fix the commit message to pass the linting')
    .action(lintMessage);

const promptCommand = new Command('prompt')
    .description('Create a commit message interactively')
    .addOption(configOption)
    .addOption(fileOption)
    .action(runInteractive);

program
    .version(pkgJson.version, '-v, --version', 'output the current version')
    .addCommand(checkCommand)
    .addCommand(promptCommand);

function lintMessage(): void {
    const options = checkCommand.opts();
    const config = parseConfig(options.config);
    const msg = readFileSync(options.file ?? process.stdin.fd, {
        encoding: 'utf-8',
    });
    const parsed = parseMessage(msg, config);
    const newMsg = checkMessage(parsed, config, options.fix);
    if (newMsg) {
        writeFileSync(options.file ?? process.stdout.fd, newMsg, {
            encoding: 'utf-8',
        });
    }
    process.exitCode = 0;
}

function runInteractive(): void {
    const options = promptCommand.opts();
    const config = parseConfig(options.config);

    createCommitMessage(config)
        .then(msg => {
            const rendered = renderMessage(msg, config);
            if (options.file) {
                let orig = readFileSync(options.file, { encoding: 'utf-8' })
                    .split('\n')
                    .filter(s => s.startsWith('#'))
                    .join('\n');

                return promises.writeFile(
                    options.file,
                    rendered + '\n\n' + orig,
                    {
                        encoding: 'utf-8',
                    }
                );
            } else {
                console.log(rendered);
            }
        })
        .then(() => {
            process.exitCode = 0;
        });
}

program.parse(process.argv);
