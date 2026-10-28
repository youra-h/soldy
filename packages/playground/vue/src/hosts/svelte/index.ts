import { flushSync, mount, unmount } from 'svelte'
import {
	componentDescriptors,
	findComponent,
	partsOf,
	type IPreviewHost,
} from '@soldy-ui/playground-shared'
import { PREVIEWS, type TPreview, type TPreviewProps } from './previews'
import { FIXTURES } from './fixtures'
import { listenersOf } from './events'
import { instanceSnippet, propSnippet } from './snippet'
import { TLive, language } from './live.svelte'
import Root from './Root.svelte'

/** What to draw: the fixture by its key, without a key — the component's preview. */
function drawing(component: string, fixture: string | undefined): TPreview {
	const found = fixture === undefined ? PREVIEWS[component] : FIXTURES[fixture]

	if (!found) {
		throw new Error(`[playground] хост Svelte не умеет рисовать «${fixture ?? component}»`)
	}

	return found
}

/**
 * The Svelte host.
 *
 * A preview is its own Svelte root (`mount`) on the shell's node, with
 * `LocaleProvider` on top (`Root.svelte`): the shell's context does not reach
 * another root, so the host gives the root the header's language. The root's
 * props and the language are `$state.raw` cells (`live.svelte.ts`): a change
 * redraws the same root instead of mounting a new one, and the provider writes
 * a new locale to its source — the components are not remounted.
 *
 * Every change goes through `flushSync`: the contract promises the component
 * in the DOM when `mount` returns, and Svelte applies changes on its own tick.
 * The shell changes props and language from its own watchers, outside
 * Svelte's tick, where a synchronous flush is allowed.
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
		const bind = new TLive<TPreviewProps>({ ...props, ...listeners })
		const root = mount(Root, { target: node, props: { preview, bind, parts, count } })

		flushSync()

		return {
			update(next) {
				bind.current = { ...next, ...listeners }
				flushSync()
			},
			unmount() {
				void unmount(root)
			},
		}
	},

	setLocale(next) {
		language.current = next
		flushSync()
	},

	snippets: { extension: 'svelte', propSnippet, instanceSnippet },
}

export default host
