import type { App } from 'vue'
import { createVuetify } from 'vuetify'
import { VApp } from 'vuetify/components/VApp'
import { aliases, mdi } from 'vuetify/iconsets/mdi-svg'
import 'vuetify/styles'

/**
 * Vuetify as its docs set it up for a tree-shaken build: `createVuetify()`
 * without the component registry (pages import their components), the
 * default light theme and `VApp` at the root. Icons — the MDI SVG set the
 * docs offer instead of the icon font: the font is a separate package and
 * its glyphs would not count anyway.
 */
export function install(app: App): void {
	app.use(createVuetify({ icons: { defaultSet: 'mdi', aliases, sets: { mdi } } }))
}

export const Root = VApp
