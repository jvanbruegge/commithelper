import { Command } from 'commander';
import { readFileSync } from 'fs';
import { resolve } from 'path';

import { parseConfig } from './config';

const program = new Command();

const pkgJson = JSON.parse(
    readFileSync(resolve(__dirname, '..', 'package.json'), {
        encoding: 'utf-8',
    })
);

program
    .version(pkgJson.version, '-v, --version', 'output the current version')
    .option('-c, --config <file>', 'the path to the commithelper config file');

program
    .command('check <commit_file>')
    .description('lint a commit message according to the configuration')
    .action(file => {
        const msg = readFileSync(file, { encoding: 'utf-8' });
        lintMessage(msg);
    });

program
    .command('prompt')
    .description('Create a commit message interactively')
    .action(runInteractive);

function lintMessage(commitMsg: string): void {
    console.log(commitMsg);
}

function runInteractive(): void {
    const options = program.opts();
    const config = parseConfig(options.config);
    console.log(options);
    console.log(config);
}

program.parse(process.argv);
