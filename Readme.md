# monorepo-dependencies-check

In a monorepo architecture you often want to keep your dependencies synchronized between packages.
This *CLI* tool will help you check the versions.

## Install

```bash
npm install monorepo-dependencies-check
```

## Usage

```bash
monorepo-dependencies-check -p react
```

Will look in all your workspace packages to compare `react` version with the `root` package.json file.
It will use semver to compare versions.

```bash
monorepo-dependencies-check -p react ..
```

With `..`, it will look in package.json in relative path. 

You could also check for as many packages as you want.


```bash
monorepo-dependencies-check -p react styled-components babel eslint
```
