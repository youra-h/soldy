# Soldy UI playground

**The development stand of Soldy UI: every component with its props, events and test scenarios,
drawn by the framework picked in the header.**

The playground is one application for every framework. The shell — header, menus, prop editors,
the tests page — is a Vue app built from Soldy UI components, and the previews are drawn by the
_host_ of the framework picked in the header. A host is a folder in
[`vue/src/hosts/`](vue/src/hosts/): the framework's previews and scenario fixtures, and the code
that mounts them into a node the shell hands over, in a root of that framework. Vue is a host like
the others, with an app of its own.

It is a tool for developing the library, not a part of it: both workspaces of the playground are
private and are not published.

## Running it

From the repository root:

```bash
npm install
npm run dev
```

`npm run dev` starts the playground's Vite dev server and rebuilds the oren theme on change. The
playground takes the other packages from their sources, so a change in `packages/core` shows up
without a build.

The framework is the first segment of the address: `#/<framework>/<component>`, for example
`#/react/button`. The framework select in the header changes only this segment, and the values set
on the page survive the switch. The root address and an unknown framework lead to `#/vue`.

## Pages

- **Overview**, `#/<framework>` — every component the host can draw, with no props set. A click
  opens the component page.
- **Component page**, `#/<framework>/<component>` — a row for each prop, grouped by owner: the
  component, its collection, its plugins. A row draws the component twice: from props (Component)
  and from a core instance passed as `ctrl` (Component Instance), with the code of each column to
  copy or, under the dev server, to open in VS Code. Events go to the browser console, marked with
  the column that sent them.
- **Tests**, `#/<framework>/tests/<topic>/<component>` — scenarios by topic: events, slots,
  motion. Automatic scenarios run together with one button; manual ones run one at a time and wait
  for a person, who marks the result ✓ or ✗. Results are kept per framework.

The header also sets what is global to the page: the motion mode, the language, the theme, the icon
pack and the dark scheme. The shell's own labels are mostly in Russian; the language select
switches the strings and formats the components draw, not those labels.

The menus show the components that both the library and the framework's host have. Which
components each adapter implements is in the [adapter table](../../README.md#components) of the
root README.

## What is where

```
shared/       @soldy-ui/playground-shared — data with no framework in it
  src/        component registry, prop descriptions, enum values, the preview host contract
              (host.ts), test scenarios: contract, topics, runner, journal, scenario host
vue/          @soldy-ui/playground-vue — the application
  src/        the shell: pages, header and menus, prop rows, the preview stage
    hosts/    one folder per framework: previews, scenario fixtures, mounting
  __tests__/  the shell and every host, in jsdom
  browser/    layout and browser default actions, in real Chromium
```

## Tests

```bash
npm run test:playground          # Vitest: shared/__tests__ and vue/__tests__
npx playwright install chromium  # once per machine, and again after a Playwright upgrade
npm run test:layout              # vue/browser in Chromium; builds the theme CSS first
```

`test:layout` runs in the Chromium that Playwright installs, pinned by `package-lock.json`, not in
the system Chrome. Neither command runs the scenarios of the tests page: they run in the
playground, from that page.

## Rules

The playground's rules — what it may and may not ask of the library, the host contract, how to add
a host for another framework, what guards the playground — are in [AGENTS.md](AGENTS.md) (in
Russian).
