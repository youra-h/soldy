import { render } from 'svelte/server'
import { PREVIEWS } from '../../../packages/playground/vue/src/hosts/svelte/previews'
import { measure } from './measure'
import Page from './Page.svelte'

/** The Svelte page: a render per request (`render` of `svelte/server`). */
await measure(
	{
		framework: 'svelte',
		async render(locale, components) {
			const previews = components.map(({ id, props }) => ({ preview: PREVIEWS[id], props }))

			return render(Page, { props: { locale, previews } }).body
		},
	},
	Object.keys(PREVIEWS),
)
