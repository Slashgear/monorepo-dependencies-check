#!/usr/bin/env node
/* eslint-disable no-console,import/no-dynamic-require,global-require,no-param-reassign */
const path = require('path');
const yargs = require('yargs');
const chalk = require('chalk');
const _ = require('lodash');
const glob = require('glob-promise');
const { spawn } = require('child_process');

const { argv } = yargs
  .usage('Usage: $0 <command> [options]')
  .alias('p', 'packages')
  .array('p')
  .describe('p', 'package names')
  .demandOption(['p'])
  .option('path', {
    describe: 'path to package.json',
    default: '.',
  })
  .help('h')
  .alias('h', 'help');

const packagesToCheck = argv.p;
const rootPackage = require(path.join(process.cwd(), argv.path, '/package.json'));

const workspaces = rootPackage.workspaces || [];

console.log(chalk.green(`Checking ${packagesToCheck} version in current workspace`));

if (!workspaces.length) {
  console.log(chalk.green(`No workspace defined`));
  process.exit(0);
}

const rootVersions = _.pick(_.merge({}, rootPackage.dependencies, rootPackage.devDependencies), packagesToCheck);

spawn('yarn', ['workspaces', 'info', '--json']);

const filterDependenciesBypackage = packages =>
  _.reduce(
    _.flatMap(packages),
    (accumulator, pack) => {
      // Loading package.json
      const packageJson = require(path.join(process.cwd(), argv.path, pack));
      accumulator[pack] = _.pick(
        _.merge({}, packageJson.dependencies, packageJson.devDependencies, packageJson.peerDependencies),
        packagesToCheck,
      );

      return accumulator;
    },
    {},
  );

const hasErrorsPackage = pack => _.some(pack, (value, key) => rootVersions[key] && rootVersions[key] !== value);

Promise.all(workspaces.map(workspace => glob(`${workspace}/package.json`)))
  .then(packages => {
    const dependenciesValueByPackages = filterDependenciesBypackage(packages);
    const withErrorPackages = _.reduce(
      dependenciesValueByPackages,
      (accumulator, pack, key) => {
        if (hasErrorsPackage(pack)) {
          accumulator[key] = pack;
        }

        return accumulator;
      },
      {},
    );

    if (!_.isEmpty(withErrorPackages)) {
      console.error(chalk.red('Some package have not a valid dependency value'));
      console.log(withErrorPackages);
      console.log(chalk.red('Root package values are:'));
      console.log(rootVersions);
      process.exit(1);
    } else {
      console.log(chalk.green(`Packages ${packagesToCheck} version is synchronized in all workspace`));
      process.exit(0);
    }
  })
  .catch(error => console.error(chalk.red(error)) && process.exit(1));
