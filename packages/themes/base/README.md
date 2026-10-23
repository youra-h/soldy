# @soldy-ui/theme-base

**The shared layer of Soldy UI themes: what the components need in any theme — a reset of the
library's own nodes, the writing-direction sign and the structure of the components, with its
numbers in variables. Plain CSS, no preprocessor, no Tailwind.**

Part of [Soldy UI](https://github.com/youra-h/soldy) — UI components with the logic written once: a
framework-agnostic core and thin adapters that render it in Vue, React, Angular, Svelte, Solid and
Web Components.

## Who needs it

Theme authors. A theme imports this package into its own stylesheet, and the application plugs in
the theme as one file. If you use a ready theme such as
[`@soldy-ui/theme-oren`](https://www.npmjs.com/package/@soldy-ui/theme-oren), you do not install
this package — the theme already carries it.

## What is inside

- **A reset of the library's nodes.** Box sizing, margins, borders, and the font and color of
  buttons and fields — only for elements with a `so-*` class and the inner nodes of the components.
  The page itself is left alone: no rules for `html`, `body`, headings, lists or your own buttons.
  The components inherit the font and line height of the page.
- **The writing-direction sign** `--so-dir-sign`: `1` left to right and `-1` right to left, taken
  from the nearest `dir` attribute. A theme mirrors arrows, gradients and offsets by multiplying by
  it — `:dir()` does not survive minification, and a `[dir]` selector on an ancestor does not see
  the nearest `dir`.
- **The structure of the components** — layout and mechanics: where a part stands, what catches a
  click, cursors, how a disabled component fades. So far for Label, Field, Icon, Switch, CheckBox,
  RadioGroup, Button, Input, Textarea, NumberInput, Tabs, Tags, Accordion, ListBox, Menu, Select,
  Popover, Tooltip, Dialog and Drawer; the rest of the components follow. Without a theme they are
  bare but working: a switch toggles by a click on its track, a label toggles its control, the
  slots of a button and of a field stay at its edges, a tabs list stands on its side of the panel,
  a row of tags scrolls, a collapsed accordion section takes no room, a closed panel lets clicks
  through, the body of a dialog scrolls under a header and a footer that stay in place, a drawer
  stands at its edge.
- **The size scales** — heights, paddings, gaps and font sizes per size — as variables on the
  document root with defaults, such as `--so-button-height-sm` or `--so-caption-gap-lg`. A theme
  sets its own numbers there, an application on an ancestor of its area.

It has no look: no colors, borders, radii, shadows, no names of a theme's variants or views — those
are the theme's. Where the layout counts on a number of the look — the border width of a field, the
width of the fade at the edge of a scrolling row of tags, the thickness of a group separator — the
theme sets it in a variable, and without a theme it is zero. The surface of an overlay panel is the
theme's too: the theme paints the panel with `--so-panel-surface`, and this package announces it
as the surface of the place inside the panel. Every variable a theme may set is listed with its
meaning in `theme-variables.json`, and so are those the library writes itself, such as the size of
a dialog.

## Usage in a theme

Import the package first in the theme's stylesheet:

```css
@import '@soldy-ui/theme-base';
```

Its rules live in the cascade layer `so`, the reset in the sub-layer `so.reset`, so any rule of the
theme outside a layer overrides them without fighting specificity.

A theme built with Tailwind puts the package into Tailwind's `base` layer, where preflight used to
be, so it stays below the application's utilities:

```css
@layer theme, base, components, utilities;
@import 'tailwindcss/theme.css' layer(theme);
@import 'tailwindcss/utilities.css' layer(utilities);
@import '@soldy-ui/theme-base' layer(base);
```

## Layer order next to Tailwind

A stylesheet that brings the `so` layer to the top level — this package imported as is, or a theme
that does so — goes into the application's cascade by the order in which layers first appear. If
the application uses Tailwind, name the order before any stylesheet loads, so that `so` stays below
`components` and `utilities` and a utility class on a component still wins:

```css
@layer theme, base, so, components, utilities;
```

## Documentation

- [Soldy UI README](https://github.com/youra-h/soldy#readme) — what the library is and how it is
  put together.
- [The package's own notes](https://github.com/youra-h/soldy/blob/main/packages/themes/base/AGENTS.md)
  — layers, the reset, the direction sign, the variable contract and the checks every theme
  passes (in Russian).

## License

[MIT](https://github.com/youra-h/soldy/blob/main/LICENSE)
