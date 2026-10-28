import { createComponent, createSignal } from 'solid-js'
import { render } from 'solid-js/web'
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
import { Root, setLanguage } from './Root'

/** What to draw: the fixture by its key, without a key — the component's preview. */
function drawing(component: string, fixture: string | undefined): TPreview {
	const found = fixture === undefined ? PREVIEWS[component] : FIXTURES[fixture]

	if (!found) {
		throw new Error(`[playground] хост Solid не умеет рисовать «${fixture ?? component}»`)
	}

	return found
}

/**
 * The Solid host.
 *
 * A preview is its own Solid root (`render`) on the shell's node, with
 * `LocaleProvider` on top (`Root`): the shell's context does not reach another
 * root, so the host gives the root the header's language. The root's props and
 * the language are signals: a Solid component body runs once and learns of a
 * change only from a signal. New props are a new signal value, not a new
 * mount, and the provider writes a new locale to its source — the components
 * are not remounted.
 *
 * Synchronous without a flush: Solid draws the root and applies a signal change
 * within the same call, so the DOM is up to date when `mount`, `update` and
 * `setLocale` return, as the contract promises.
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
		const [bind, setBind] = createSignal<TPreviewProps>({ ...props, ...listeners })
		const dispose = render(() => createComponent(Root, { preview, bind, parts, count }), node)

		return {
			update(next) {
				setBind({ ...next, ...listeners })
			},
			unmount() {
				dispose()
			},
		}
	},

	setLocale(next) {
		setLanguage(next)
	},

	snippets: { extension: 'tsx', propSnippet, instanceSnippet },
}

export default host
