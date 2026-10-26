import { defineComponent, h } from 'vue'
import { TooltipProvider } from 'reka-ui'

/**
 * Reka UI is headless: no theme and no styles, the parts come as they are.
 * shadcn-vue styles the same parts with Tailwind classes of the application;
 * the stand measures the parts unstyled — the cost of the library, not of a
 * stylesheet (benchmarks/compare/vue.md). The root is `TooltipProvider`,
 * which a tooltip requires above it.
 */
export const Root = defineComponent({
	name: 'RekaRoot',
	setup(_, { slots }) {
		return () => h(TooltipProvider, null, slots)
	},
})
