/**
 * Globals of an application with a pattern index signature, the way Nuxt types
 * the injections of its plugins: a plugin that provides nothing adds
 * `$${string}`. The closed instance of a component keeps the own keys of Vue
 * under it — `$props`, `$el`, `$slots` — or vue-tsc stops checking the props of
 * the library's components in such an application (docs/agents/build.md,
 * «Прогон установки»). The type check of this package runs under it:
 * `root-ref.spec.ts` reads `$props` of the closed instance, and
 * `TemplateProps.test.vue` passes wrong prop values.
 */

import 'vue'

declare module 'vue' {
	interface ComponentCustomProperties {
		[key: `$${string}`]: unknown
	}
}
