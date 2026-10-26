import '@spectrum-web-components/theme/sp-theme.js'
import '@spectrum-web-components/theme/theme-light.js'
import '@spectrum-web-components/theme/scale-medium.js'
import { h } from '../dom'

/**
 * Spectrum Web Components: every page lives in `<sp-theme>` — the theme
 * provider the documentation asks for (light color, medium scale). Each page
 * file registers only its own elements (`@spectrum-web-components/<pkg>/sp-*.js`).
 */
export function root(): HTMLElement {
	return h('sp-theme', { system: 'spectrum', color: 'light', scale: 'medium' })
}
