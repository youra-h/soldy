import { createApp, h, shallowRef } from 'vue'
import { enUS, type TLocale } from '@soldy-ui/plugins'
import { LocaleProvider } from '@soldy-ui/vue'
import {
	componentDescriptors,
	findComponent,
	partsOf,
	type IPreviewHost,
} from '@soldy-ui/playground-shared'
import { PREVIEWS, toComponent, type TPreview } from './previews'
import { FIXTURES } from './fixtures'
import { listenersOf } from './events'
import { instanceSnippet, propSnippet } from './snippet'

/**
 * The header's language, one for all the host's roots. A root reads it on
 * render, so a change reaches every root's provider without a remount.
 */
const locale = shallowRef<TLocale>(enUS)

/** Preview apps mounted so far: the number in the next one's id prefix (see `mount`). */
let apps = 0

/** What to draw: the fixture under its key, or without one the component's preview. */
function drawing(component: string, fixture: string | undefined): TPreview {
	const found = fixture === undefined ? PREVIEWS[component] : FIXTURES[fixture]

	if (!found) throw new Error(`[playground] хост Vue не умеет рисовать «${fixture ?? component}»`)

	return found
}

/**
 * The Vue host.
 *
 * The preview mounts as its own app (`createApp`) on the shell's node, not in
 * the shell's tree: the other frameworks' hosts draw the same way, so the
 * render path is one for all. The root is a `LocaleProvider`: the shell's
 * context (`provide`) does not cross into another app, so the host gives the
 * root the header's language.
 *
 * The app keeps the props in its own `shallowRef`: `update` swaps the whole
 * set, and Vue passes the component what changed.
 *
 * Each app has its own id prefix (`app.config.idPrefix`). Vue's `useId`
 * derives an id from the place in the app tree, so two identical previews
 * (a page row has two) would share mount ids, and with them the parts' `id`
 * and the panels' owner marks (`data-owner`). Layer plugins find a panel by
 * the first mark in the document, so the gesture, focus and inert background
 * would go to someone else's hidden panel. Vue asks to tell several apps on a
 * page apart by prefix; `v`, the default, is the shell's. Guarded by
 * «пометки панелей владельцами не повторяются» in `__tests__/smoke/suite.ts`.
 */
const host: IPreviewHost = {
	previews: Object.keys(PREVIEWS),
	fixtures: Object.keys(FIXTURES),

	mount(node, { component, fixture, props, onEvent, count = 1 }) {
		const entry = findComponent(component)
		const listeners = entry && onEvent ? listenersOf(componentDescriptors(entry), onEvent) : {}
		// A fixture's markup is its own: its parts are not listened to
		const parts =
			entry && onEvent && fixture === undefined ? partsOf(entry, onEvent, listenersOf) : {}
		const preview = toComponent(drawing(component, fixture), parts)
		const bind = shallowRef(props)
		const app = createApp({
			render: () =>
				h(LocaleProvider, { locale: locale.value }, () =>
					Array.from({ length: count }, (_, key) =>
						h(preview, { ...bind.value, ...listeners, key }),
					),
				),
		})

		app.config.idPrefix = `preview${++apps}`
		app.mount(node)

		return {
			update(next) {
				bind.value = next
			},
			unmount() {
				app.unmount()
			},
		}
	},

	setLocale(next) {
		locale.value = next
	},

	snippets: { extension: 'vue', propSnippet, instanceSnippet },
}

export default host
