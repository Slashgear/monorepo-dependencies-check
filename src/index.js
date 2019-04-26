#!/usr/bin/env node
/* eslint-disable no-console,import/no-dynamic-require,global-require,no-param-reassign */
const path = require('path');
const yargs = require('yargs');
const chalk = require('chalk');
const _ = require('lodash');
const glob = require('glob-promise');

const { argv } = yargs
  .usage('Usage: $0 <command> [options]')
  .alias('p', 'packages')
  .array('p')
  .describe('p', 'package names')
  .option('all', {
    describe: 'should check all dependencies',
    default: false,
  })
  .alias('a', 'all')
  .option('path', {
    describe: 'path to package.json',
    default: '.',
  })
  .help('h')
  .alias('h', 'help');

const shouldCheckAllPackages = argv.a || (!argv.a && !argv.p);
const packagesToCheck = argv.p;
const rootPackage = require(path.join(process.cwd(), argv.path, '/package.json'));

const workspaces = rootPackage.workspaces || [];

if (shouldCheckAllPackages) {
  console.log(chalk.green(`Checking all dependencies version in current workspace`));
} else {
  console.log(chalk.green(`Checking ${packagesToCheck} version in current workspace`));
}

if (!workspaces.length) {
  console.log(chalk.green(`No workspace defined`));
  process.exit(0);
}

const filterPackages = shouldCheckAllPackages ? _.identity : packages => _.pick(packages, packagesToCheck);

const rootVersions = filterPackages(_.merge({}, rootPackage.dependencies, rootPackage.devDependencies));

const filterDependenciesByPackage = packages =>
  _.reduce(
    _.flatMap(packages),
    (accumulator, pack) => {
      // Loading package.json
      if (!/node_modules/.test(pack)) {
        const packageJson = require(path.join(process.cwd(), argv.path, pack));
        accumulator[pack] = filterPackages(_.merge({}, packageJson.dependencies, packageJson.devDependencies));
      }

      return accumulator;
    },
    {},
  );

const matchVersion = (version1, version2) => !version1.includes(version2);

const hasErrorsPackage = pack =>
  _.reduce(
    pack,
    (accumulator, value, key) => {
      if (rootVersions[key] && matchVersion(value, rootVersions[key])) {
        accumulator[key] = value;
      }

      return accumulator;
    },
    {},
  );

Promise.all(workspaces.map(workspace => glob(`${workspace}/package.json`)))
  .then(packages => {
    const dependenciesValueByPackages = filterDependenciesByPackage(packages);
    const withErrorPackages = _.reduce(
      dependenciesValueByPackages,
      (accumulator, pack, key) => {
        const listErrors = hasErrorsPackage(pack);
        if (!_.isEmpty(listErrors)) {
          accumulator[key] = listErrors;
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
      console.log(chalk.green(`Packages version is synchronized in all workspace`));
      process.exit(0);
    }
  })
  .catch(error => console.error(chalk.red(error)) && process.exit(1));
