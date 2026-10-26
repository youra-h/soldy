import type { App } from 'vue'
import PrimeVue from 'primevue/config'
import Tooltip from 'primevue/tooltip'
import Aura from '@primeuix/themes/aura'

/**
 * PrimeVue as its docs set it up: the plugin with the Aura preset — the
 * default theme, its styles injected at runtime — and the tooltip directive,
 * which an application registers itself.
 */
export function install(app: App): void {
	app.use(PrimeVue, { theme: { preset: Aura } })
	app.directive('tooltip', Tooltip)
}
