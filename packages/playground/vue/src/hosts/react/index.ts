import { Fragment, createElement } from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { enUS, type TLocale } from '@soldy-ui/plugins'
import { LocaleProvider } from '@soldy-ui/react'
import {
	componentDescriptors,
	findComponent,
	partsOf,
	type IPreviewHost,
} from '@soldy-ui/playground-shared'
import { PREVIEWS, type TPreview } from './previews'
import { FIXTURES } from './fixtures'
import { listenersOf } from './events'
import { instanceSnippet, propSnippet } from './snippet'

/** The header's language — one for all the host's roots. */
let locale: TLocale = enUS

/** Draws of the live roots: a language change redraws each of them. */
const roots = new Set<() => void>()

/** Preview roots mounted so far — the number in the next root's id prefix (see `mount`). */
let mounted = 0

/** What to draw: the fixture by its key, without a key — the component's preview. */
function drawing(component: string, fixture: string | undefined): TPreview {
	const found = fixture === undefined ? PREVIEWS[component] : FIXTURES[fixture]

	if (!found) {
		throw new Error(`[playground] хост React не умеет рисовать «${fixture ?? component}»`)
	}

	return found
}

/**
 * The React host.
 *
 * A preview is its own React root (`createRoot`) on the shell's node, with
 * `LocaleProvider` on top: the shell's context does not reach another root, so
 * the host gives the root the header's language. A language change redraws the
 * roots with the provider's new locale, and the provider writes it to its
 * source — the components are not remounted.
 *
 * Every draw goes through `flushSync`: the contract promises the component in
 * the DOM when `mount` returns, and the shell changes props and language from
 * its own watchers, outside React's rendering, where a synchronous flush is
 * allowed. A draw on the same root is an update, not a new mount: React
 * reconciles the tree with the previous one.
 *
 * Each root has its own id prefix (`identifierPrefix`), like `idPrefix` of the
 * Vue host's apps. `useId` derives ids from the place in the root's tree, so
 * the two identical previews of a page row would share mount ids, the parts'
 * `id`s and the panels' owner marks (`data-owner`). The layer plugins find a
 * panel by the first mark in the document, and the gesture, the focus and the
 * inert background would go to the other preview's hidden panel. Guarded by
 * «пометки панелей владельцами не повторяются» in `__tests__/smoke/suite.ts`.
 */
const host: IPreviewHost = {
	previews: Object.keys(PREVIEWS),
	fixtures: Object.keys(FIXTURES),

	mount(node, { component, fixture, props, onEvent, count = 1 }) {
		const preview = drawing(component, fixture)
		const entry = findComponent(component)
		const listeners = entry && onEvent ? listenersOf(componentDescriptors(entry), onEvent) : {}
		// A fixture's markup is its own: its parts are not listened to
		const parts =
			entry && onEvent && fixture === undefined ? partsOf(entry, onEvent, listenersOf) : {}
		const root = createRoot(node, { identifierPrefix: `preview${++mounted}-` })
		let bind = props

		const draw = () =>
			flushSync(() =>
				root.render(
					createElement(
						LocaleProvider,
						{ locale },
						Array.from({ length: count }, (_, key) =>
							createElement(
								Fragment,
								{ key },
								preview({ ...bind, ...listeners }, parts),
							),
						),
					),
				),
			)

		draw()
		roots.add(draw)

		return {
			update(next) {
				bind = next
				draw()
			},
			unmount() {
				roots.delete(draw)
				root.unmount()
			},
		}
	},

	setLocale(next) {
		locale = next

		for (const draw of roots) draw()
	},

	snippets: { extension: 'tsx', propSnippet, instanceSnippet },
}

export default host
