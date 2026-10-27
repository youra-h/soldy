import { Fragment } from 'react'
import { renderToString } from 'react-dom/server'
import { LocaleProvider } from '@soldy-ui/react'
import { PREVIEWS } from '../../../packages/playground/vue/src/hosts/react/previews'
import { measure } from './measure'

/**
 * The React page: a tree per request (`renderToString`), with the previews of
 * the stand's React host under the provider.
 */
await measure(
	{
		framework: 'react',
		async render(locale, components) {
			return renderToString(
				<LocaleProvider locale={locale}>
					{components.map(({ id, props }) => (
						<Fragment key={id}>{PREVIEWS[id](props)}</Fragment>
					))}
				</LocaleProvider>,
			)
		},
	},
	Object.keys(PREVIEWS),
)
