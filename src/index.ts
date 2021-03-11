import { Command, Option } from 'commander';
import { readFileSync, promises } from 'fs';
import { resolve } from 'path';

import { parseConfig } from './config';
import { createCommitMessage } from './prompt';
import { renderMessage } from './message';

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
    .action(file => {
        const msg = readFileSync(file, { encoding: 'utf-8' });
        lintMessage(msg);
    });

const promptCommand = new Command('prompt')
    .description('Create a commit message interactively')
    .addOption(configOption)
    .addOption(fileOption)
    .action(runInteractive);

program
    .version(pkgJson.version, '-v, --version', 'output the current version')
    .addCommand(checkCommand)
    .addCommand(promptCommand);

function lintMessage(commitMsg: string): void {
    console.log(commitMsg);
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
