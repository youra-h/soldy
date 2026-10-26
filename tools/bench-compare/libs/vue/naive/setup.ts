import { defineComponent, h } from 'vue'
import { NConfigProvider } from 'naive-ui'

/**
 * Naive UI as its docs set it up: the components carry their styles (CSS in
 * JS), the default light theme needs no provider; `NConfigProvider` is the
 * root an application puts around them anyway — for locale and theme.
 */
export const Root = defineComponent({
	name: 'NaiveRoot',
	setup(_, { slots }) {
		return () => h(NConfigProvider, null, slots)
	},
})
