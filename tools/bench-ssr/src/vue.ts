import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { LocaleProvider } from '@soldy-ui/vue'
import { PREVIEW_COMPONENTS } from '../../../packages/playground/vue/src/hosts/vue/previews'
import { measure } from './measure'

/**
 * The Vue page: an application per request (`createSSRApp`), as a server
 * renders one, with the previews of the stand's Vue host under the provider.
 */
await measure(
	{
		framework: 'vue',
		render(locale, components) {
			const app = createSSRApp({
				render: () =>
					h(LocaleProvider, { locale }, () =>
						components.map(({ id, props }) =>
							h(PREVIEW_COMPONENTS[id], { ...props, key: id }),
						),
					),
			})

			return renderToString(app)
		},
	},
	Object.keys(PREVIEW_COMPONENTS),
)
