# @soldy-ui/theme-oren

**The oren theme: CSS for the BEM classes and `data-*` attributes of Soldy UI, in a light and a
dark scheme.**

Part of [Soldy UI](https://github.com/youra-h/soldy) — UI components with the logic written once: a
framework-agnostic core and thin adapters that render it in Vue, React, Angular, Svelte, Solid and
Web Components.

The library emits `s-*` classes and `data-*` state attributes; a theme styles them. It never styles
`aria-*`, so an accessibility fix cannot break the look. A theme also declares the set of values
its design offers — `variant`, `view`, `shape`, `animation` — and the library takes those names
from it, not the other way round.

## Install

```bash
npm install @soldy-ui/theme-oren
```

## Usage

The stylesheet and the theme's own behavior are plugged in side by side, in the application's entry
point:

```ts
import { useTheme } from '@soldy-ui/setup'
import oren from '@soldy-ui/theme-oren/setup'

import '@soldy-ui/theme-oren'

useTheme(oren)
```

`./setup` carries the plugins and collection extensions the theme's CSS reads — without it the
styles are in place, but what CSS takes from plugin variables is not drawn: the bar under the
active tab.

The dark scheme is switched on with an attribute on the root element:

```html
<html data-theme="oren-dark"></html>
```

## Documentation

- [Soldy UI README](https://github.com/youra-h/soldy#readme) — what the library is and how it is
  put together.
- [The theme's own notes](https://github.com/youra-h/soldy/blob/main/packages/themes/oren/AGENTS.md)
  — scales, step roles, semantic tokens, color schemes (in Russian).

## License

[MIT](https://github.com/youra-h/soldy/blob/main/LICENSE)
