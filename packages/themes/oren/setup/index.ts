/**
 * The behavior of the oren theme: plugins and collection extensions whose data
 * its CSS reads.
 *
 * The application plugs it in once, at its entry point:
 *
 *   import oren from '@soldy-ui/theme-oren/setup'
 *
 *   useTheme(oren)
 *
 * The stylesheet goes next to it, where the build takes styles from: an import
 * in the entry module or the root layout with Vite, Next.js, SvelteKit and
 * SolidStart (`import '@soldy-ui/theme-oren'`), `@import` in `src/styles.css`
 * with Angular CLI, `css` in `nuxt.config.ts` with Nuxt — the package README,
 * "Usage".
 *
 * Without the call the styles are in place, but what the CSS reads from the
 * variables of plugins is not drawn: there is no bar under the active tab, the
 * card of the active `contained` tab stays on the tab itself and does not move
 * to a new one, the scroll margin of the focus under a sticky Table head is one
 * row of the head, so a head of several rows covers the focus, and the toasts
 * behind the front one of a stack take its height at once, with no transition.
 *
 * The plugins are the layout plugins of the shared theme layer
 * (`@soldy-ui/theme-base/setup`): the shared layer has no `useTheme` of its own,
 * so the theme installs them. Their classes are not exported from here — the
 * shared layer exports them.
 *
 * The layout follows the kind of registration: `plugins/` is the plugin
 * installer (`install.ts`). Collection extensions will stand next to it the
 * same way: `extensions/` with its own installer, plugged in here.
 *
 * The values of the theme — `variant`, `view`, `shape`, `animation` — are
 * declared in `index.d.ts` of the package, and the reference below brings them
 * along with the declarations of this module. The stylesheet does not bring
 * them everywhere: Angular CLI and Nuxt take it from their configs, not from a
 * module of TS, while this module every application imports from TS. Without
 * the reference `variant="accent"` would fail the type check there.
 * `preserve="true"` keeps the reference in the emitted `.d.ts`: tsc drops a
 * plain one, as it drops `import type {}`.
 */

/// <reference types="@soldy-ui/theme-oren" preserve="true" />

import { defineTheme } from '@soldy-ui/setup'
import { plugins } from './plugins'

export default defineTheme({
	name: 'oren',
	plugins,
})
