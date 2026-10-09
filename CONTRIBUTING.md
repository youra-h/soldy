# Contributing to Soldy UI

Thank you for your interest in Soldy UI. The project is in early development (`0.x`): the API
still changes, and the architecture rules below are enforced strictly. This page explains how to
report problems, how to propose changes, and what a pull request needs to be merged.

By taking part you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Reporting issues

- **Bugs** — use the
  [Bug report](https://github.com/youra-h/soldy/issues/new?template=bug.yml) form. Name the
  framework adapter and the version, and give a minimal reproduction.
- **Accessibility barriers** — use the
  [Accessibility barrier](https://github.com/youra-h/soldy/issues/new?template=accessibility.yml)
  form. See also [ACCESSIBILITY.md](ACCESSIBILITY.md).
- **Feature requests and new components** — use the
  [Feature request](https://github.com/youra-h/soldy/issues/new?template=feature.yml) form.
- **Security vulnerabilities** — never in a public issue; see [SECURITY.md](SECURITY.md).

## Before you start on a change

For anything larger than a typo or an obvious bug fix, **open an issue first** and wait for
agreement on the approach. Most of the code is shared by six framework adapters, and a change
that looks local often is not. Agreeing up front saves you from rewriting a finished pull request.

Changes to `packages/setup/protected/` — the mechanics shared by all adapters (`define`,
`naming`, `registry`, `adapter`) — need the maintainer's agreement before any work starts.

## Setting up

You need Node `^22.12.0 || ^24 || >=26` and npm.

```bash
git clone https://github.com/<you>/soldy.git
cd soldy
npm install
npm run dev          # playground with the theme rebuilt on change
```

Tests and the playground do not need a build: packages import their neighbors from source.

## Commands

```bash
npm run test:core    # core
npm run test:setup   # setup
npm run test:plugins # plugins
npm run test:vue     # Vue adapter (likewise test:react, test:angular, …)
npm run test:theme   # theme token invariants
npm run test:layout  # layout and interaction in real Chromium (needs `npx playwright install chromium`)
npm run lint         # ESLint, with auto-fix
npm run format       # Prettier
npm run build        # build all library packages
```

The full list, with notes, is in [AGENTS.md → Commands](AGENTS.md#commands).

## How the code is organized

The behavior of a component lives in a framework-agnostic core; framework adapters only wire it up.
Read [docs/architecture.md](docs/architecture.md) before changing adapter, descriptor or plugin
code. The rules that most often decide whether a pull request is accepted:

- **Layer boundaries.** `packages/core`, `packages/setup` and `packages/plugins` never import a
  framework. Framework code lives only in `packages/ui/*`.
- **No logic in adapters.** If the code you wrote would have to be repeated in the other five
  adapters, it belongs in the core, a plugin or a collection extension. Components in
  `packages/ui/*/src/components` use no reactivity primitives or lifecycle hooks of their own;
  those live in the adapter layer (`src/adapter`).
- **Fix the cause, not the symptom.** No type casts to silence an error (`as any`,
  `as unknown as X`, non-null `!`, `@ts-ignore` fail CI), no special-case branches in shared
  methods, no second copy of state next to its source. If the right fix is bigger than the task,
  say so in the issue or the pull request instead of working around it.
- **Accessibility.** Follow the WAI-ARIA Authoring Practices pattern for the widget. Themes style
  `data-*` attributes, never `aria-*`.

The detailed rules are in [AGENTS.md](AGENTS.md) and the files in [docs/agents/](docs/agents/).
They are written mostly in Russian; machine translation works well for them, and questions are
welcome in the issue or the pull request.

## Pull requests

1. Fork the repository and create a branch from `main`.
2. Make the change, with tests. A bug fix comes with a test that fails without it.
3. Run the tests of the packages you touched, `npm run lint` and `npm run format`.
4. **Add a changeset** if you changed a library package (`@soldy-ui/*`):

   ```bash
   npm run changeset -- --patch @soldy-ui/core -m "Short description of the change"
   ```

   Use `--minor` for a breaking change (there is no `major` before `1.0`), and `--empty` if only
   tests or tooling of a package changed. Changes outside library packages (docs, CI, `tools/`,
   the playground) need no changeset. Do not edit versions or `CHANGELOG.md` by hand.

5. Open the pull request against `main` and fill in the template.

CI must be green: tests of every package, type checks, the build, lint and Prettier
(`prettier --check .`), and the changeset check.

Commit messages follow the [Conventional Commits](https://www.conventionalcommits.org/) form,
with the affected packages as the scope: `feat(core, vue): …`, `fix(plugins): …`, `docs: …`.
English or Russian are both fine.

## License

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
