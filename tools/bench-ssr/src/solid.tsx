import { renderToString } from 'solid-js/web'
import { LocaleProvider } from '@soldy-ui/solid'
import { PREVIEWS } from '../../../packages/playground/vue/src/hosts/solid/previews'
import { measure } from './measure'

/**
 * The Solid page: a root per request (`renderToString`), with the previews of
 * the stand's Solid host under the provider. A preview takes its props as an
 * accessor, as the host gives them.
 */
await measure(
	{
		framework: 'solid',
		async render(locale, components) {
			return renderToString(() => (
				<LocaleProvider locale={locale}>
					{components.map(({ id, props }) => PREVIEWS[id](() => props))}
				</LocaleProvider>
			))
		},
	},
	Object.keys(PREVIEWS),
)
