# Guardian

![build status](https://github.com/hackclub/guardian/workflows/build/badge.svg)
![lint status](https://github.com/hackclub/guardian/workflows/lint/badge.svg)
![format status](https://github.com/hackclub/guardian/workflows/format/badge.svg)

![GitHub](https://img.shields.io/github/license/hackclub/guardian)
![GitHub issues](https://img.shields.io/github/issues/hackclub/guardian)
![GitHub contributors](https://img.shields.io/github/contributors/hackclub/guardian)
![GitHub last commit](https://img.shields.io/github/last-commit/hackclub/guardian)

## Getting Started

To start up a local Guardian server, you'll first need to clone and set up dependencies:

```
$ git clone https://github.com/hackclub/guardian.git
$ cd guardian && yarn
```

### Environment setup

You'll need access to two Airtables (one is optional): one for the Links feature, and one for the CoC Reporting table.

```
signing_secret="secretwooowowoowobooimaghost"
token="xoxb-numbernumbernumber"
channel="channel to post CoC reports to"
links="channel to post & receive links to shorten"
link_db_key="airtable API key for links table"
link_db="airtable db id for links"

conduct_db_key="airtable API key for the CoC reports table"
conduct_db="airtable db id for CoC reports table"

url="whatever url you're hosting Guardian on (ngrok url locally)"
```

### Commands

There's a number of useful scripts you can use for development:

- `yarn lint` & `yarn lint:check` — runs ESLint (the suffix `:check` does not run actual formatting)
- `yarn format` & `yarn format:check` — runs Prettier (the suffix `:check` does not run actual formatting)
- `yarn check` & `yarn check:fix` — runs both linting & formatting

## Project Structure

Guardian is laid out using a very simple module system. All bot features are stored in [`src/features`](src/features), and each file exports a function with type signature:

```typescript
// src/features/botFeature.ts
import { App, ExpressReceiver } from 'bolt'

const botFeature: (app: App, receiver?: ExpressReceiver): void
export default botFeature
```

To add a new feature, create a new file in `src/features` and add an export to [`src/features/index.ts`](src/features/index.ts). For the example above, you might add something like:

```typescript
// src/features/index.ts
export const { default as botFeature } from './botFeature.ts`
```

to `src/features/index.ts`
