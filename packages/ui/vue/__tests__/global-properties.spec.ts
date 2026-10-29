/**
 * The closed instance under the global properties of a Nuxt app.
 *
 * Nuxt types the injections of a plugin that provides nothing as
 * `Record<string, unknown>`, its own plugins among them, and every Nuxt app
 * gets `ComponentCustomProperties` with the signature `` `$${string}` `` from
 * them (`.nuxt/types/plugins.d.ts`). `keyof` of such a type is the signature
 * alone: it absorbs every `$` key it matches. A closed instance whose Vue keys
 * were `keyof ComponentPublicInstance` minus `keyof ComponentCustomProperties`
 * kept none of them, `$props` among them, and vue-tsc checked no prop of a
 * component in a Nuxt template.
 *
 * The augmentation below is global to the program, and so on purpose: the
 * whole type check of the package runs as a Nuxt app sees it — the props of
 * every component in `TemplateProps.test.vue` and the closed instance in
 * `root-ref.spec.ts` too. Types are checked by the CI step «Типы — Vue»:
 * `expectTypeOf` does nothing at run time.
 */

import { describe, it, expectTypeOf } from 'vitest'
import { Button, Dialog } from '@soldy-ui/vue'

declare module 'vue' {
	interface ComponentCustomProperties {
		[key: `$${string}`]: unknown
	}
}

describe('экземпляр под глобальными свойствами Nuxt', () => {
	it('свойства Vue остаются: $props, $el, $slots, $emit', () => {
		expectTypeOf<InstanceType<typeof Button>['$props']['text']>().toEqualTypeOf<
			string | undefined
		>()
		expectTypeOf<InstanceType<typeof Dialog>>().toHaveProperty('$el')
		expectTypeOf<InstanceType<typeof Dialog>>().toHaveProperty('$slots')
		expectTypeOf<InstanceType<typeof Button>>().toHaveProperty('$emit')
	})

	it('глобальных свойств приложения закрытый экземпляр не отдаёт', () => {
		// @ts-expect-error — a global property of the app is not reachable through a closed instance
		expectTypeOf<InstanceType<typeof Button>['$route']>()
	})
})
