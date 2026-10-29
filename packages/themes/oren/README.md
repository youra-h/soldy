# @soldy-ui/theme-oren

**The oren theme: CSS for the BEM classes and `data-*` attributes of Soldy UI, in a light and a
dark scheme.**

Part of [Soldy UI](https://github.com/youra-h/soldy-ui) — UI components with the logic written once: a
framework-agnostic core and thin adapters that render it in Vue, React, Angular, Svelte, Solid and
Web Components.

The library emits `so-*` classes and `data-*` state attributes; a theme styles them. It never styles
`aria-*`, so an accessibility fix cannot break the look. A theme also declares the set of values
its design offers — `variant`, `view`, `shape`, `animation` — and the library takes those names
from it, not the other way round.

## Install

```bash
npm install @soldy-ui/theme-oren
```

The theme is built on [`@soldy-ui/theme-base`](https://www.npmjs.com/package/@soldy-ui/theme-base),
the shared layer of Soldy UI themes, and depends on it: the stylesheet carries its CSS, and the
behavior installs its layout plugins. npm installs it with the theme; you do not import it
yourself. To make a theme of your own on the same layer, see
[Make your own theme](https://github.com/youra-h/soldy-ui/tree/main/packages/themes/base#make-your-own-theme).

## Usage

The theme comes in two parts: the stylesheet and the behavior. The behavior is plugged in once, in
the application's entry point:

```ts
import { useTheme } from '@soldy-ui/setup'
import oren from '@soldy-ui/theme-oren/setup'

useTheme(oren)
```

`./setup` installs the plugins whose values the theme's CSS reads — the layout plugins of the shared
layer. Without it the styles are in place, but what CSS takes from plugin variables is not drawn:
there is no bar under the active tab, the card of the active tab does not move to a new one, focus
in a table body slips under a sticky head that wraps into several rows, and the toasts behind the
front one of a stack take its height at once, with no transition.

The stylesheet goes where the build takes styles from:

- **Vite** — Vue, React, Svelte, Solid, Web Components: `import '@soldy-ui/theme-oren'` in the
  entry module, next to `useTheme`;
- **Next.js** — the same import in the root layout, `app/layout.tsx`;
- **SvelteKit** — the same import in the root layout, `src/routes/+layout.svelte`;
- **SolidStart** — the same import in `src/app.tsx`;
- **Angular CLI** — `@import '@soldy-ui/theme-oren';` in `src/styles.css`, the file listed in
  `styles` of `angular.json`. Not an `import` in `main.ts`: Angular CLI puts CSS imported from a
  module into a chunk the page never loads;
- **Nuxt** — `css: ['@soldy-ui/theme-oren']` in `nuxt.config.ts`.

The values of the theme — `variant`, `view`, `shape`, `animation` — come with the behavior: the
declarations of `@soldy-ui/theme-oren/setup` reference them, so `variant="accent"` type-checks
however the stylesheet is plugged in.

### Only the components you use

The stylesheet `@soldy-ui/theme-oren` carries every component. Next to it lies a stylesheet per
component, `@soldy-ui/theme-oren/<component>.css`, named after the component in kebab case:
`button.css`, `list-box.css`, `date-picker.css`. Each one carries the shared part — the tokens and
the color schemes, the reset of the library's nodes, the size scales — and the parts of its
component, the inner ones included: `select.css` brings Input, Tags and Button, because Select
draws its field, its tags and its rows with them. Take the stylesheets of the components your pages
use, wherever the whole stylesheet would go — with Angular CLI in `src/styles.css`:

```css
@import '@soldy-ui/theme-oren/button.css';
@import '@soldy-ui/theme-oren/select.css';
@import '@soldy-ui/theme-oren/dialog.css';
```

The bundler puts a file several stylesheets share once, and the order of the imports does not
matter: the shared part declares the order of the cascade layers before any rule. A component you
put into a slot of another — a Button in the footer of a Dialog — is yours to import as well.

### Your CSS wins

Every rule of the theme lives in a cascade layer: the structure in Tailwind's layer `base`, the
look in `components`. Your CSS outside layers and the utilities of your own Tailwind override the
theme without fighting its specificity — `<Button class="rounded-none">` takes the utility, and a
rule `.so-button { … }` of your stylesheet needs no extra weight.

A page reset outside layers wins the same way: `button { background-color: transparent }` of a
reset or of Tailwind 3 preflight takes the fill off every Button. Import such a reset into a layer
of its own before the theme — a layer named first is the weakest:

```css
@import 'modern-normalize' layer(reset);
@import '@soldy-ui/theme-oren';
```

The dark scheme is switched on with an attribute on the root element:

```html
<html data-so-theme="oren-dark"></html>
```

## The page is yours

The theme styles only the nodes of Soldy UI — elements with a `so-*` class. It ships no page reset:
Tailwind's preflight is not part of it, and outside the components it sets nothing but CSS
variables and the `color-scheme` of each scheme. Your headings, lists, links, buttons and the
`body` margin stay as your own styles leave them. The components inherit the font and the line
height of the page, so set them on the page, and bring your own reset if your markup relied on the
one the theme used to apply:

```css
html {
  font-family: system-ui, sans-serif;
  line-height: 1.5;
}

body {
  margin: 0;
}
```

## Documentation

- [Soldy UI README](https://github.com/youra-h/soldy-ui#readme) — what the library is and how it is
  put together.
- [The theme's own notes](https://github.com/youra-h/soldy-ui/blob/main/packages/themes/oren/AGENTS.md)
  — scales, step roles, semantic tokens, color schemes (in Russian).

## License

[MIT](https://github.com/youra-h/soldy-ui/blob/main/LICENSE)
