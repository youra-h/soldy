/**
 * The closed instance: what the consumer's `ref` sees of a component.
 *
 * A component has two control surfaces — props with events, and `ctrl`
 * (AGENTS.md, «Две поверхности управления») — and `ref` is the way to the
 * root, `$el`, not a third one. So the instance is closed from outside: it
 * gives the own properties of Vue (`$el`, `$props`, `$slots`…) and not the
 * bindings of the template — `ctrl`, the state, the outputs of plugins. The
 * root `$el` comes from Vue itself, and for a component whose template root is
 * a teleport, from `exposeRoot`.
 *
 * Two records close it, the run time and the type, and both are needed:
 * vue-tsc checks the template of a component by the public type of its
 * instance, so an option the type sees would close the template too.
 *
 * - `useExpose()` — the `expose` option of a component (`setup.component.ts`),
 *   closes the instance at run time;
 * - `TClosedComponent` — the type of a component at its export, closes the
 *   instance in the type.
 */

import type { ComponentCustomProperties, ComponentPublicInstance } from 'vue'

/**
 * The `expose` option of a component: an empty list — the instance opens
 * nothing but the properties of Vue.
 *
 * Every component has its own: Vue does not take it from `extends` (it warns
 * and ignores it), so `base.component.ts` has none.
 *
 * The type is `string[]`, not an empty tuple: from `expose: []` vue-tsc would
 * infer the closed type of the instance and check the template of the
 * component by it too — every binding would vanish from the template. The
 * type is closed by `TClosedComponent`.
 */
export function useExpose(): string[] {
	return []
}

/**
 * The named keys of a type, without its index signatures: `string`, `number`
 * and patterns such as `$${string}`. An object with no properties
 * (`Record<never, never>`) satisfies an index signature and never a named key.
 */
type TNamedKeys<T> = keyof {
	[K in keyof T as Record<never, never> extends Record<K, unknown> ? never : K]: T[K]
}

/**
 * The properties Vue gives on the closed instance: `$el`, `$props`, `$slots`,
 * `$emit`… The globals of the application (`ComponentCustomProperties`) the
 * closed instance does not give. Only the named ones are subtracted: Nuxt
 * types the injections of its plugins with a pattern, `$${string}`, and
 * subtracting it would take `$props` away and with it the check of the props
 * in templates.
 */
type TInstanceKeys = Exclude<
	TNamedKeys<ComponentPublicInstance>,
	TNamedKeys<ComponentCustomProperties>
>

/** The closed instance in the type: only the properties of Vue, no template bindings. */
export type TClosedInstance<TInstance extends ComponentPublicInstance> = Pick<
	TInstance,
	TInstanceKeys
>

/**
 * A component whose instance is closed (`useExpose`): its props, events and
 * slots stay — vue-tsc takes them from `$props`, `$emit` and `$slots` — while
 * the instance from `ref` is typed by the properties of Vue.
 *
 * The type is set at the export of the component, not by an option: the
 * template needs the open type, the consumer the closed one (see the head of
 * the file). There is no cast here: the open instance is a subtype of the
 * closed one, and the component is assigned to this type as it is, under the
 * check of the compiler.
 *
 * The constructor is replaced as a whole (`Omit` drops the signature of the
 * original): with two `new` signatures the original, open one would be chosen.
 */
export type TClosedComponent<TComponent extends new (...args: any[]) => ComponentPublicInstance> =
	Omit<TComponent, never> & (new (...args: any[]) => TClosedInstance<InstanceType<TComponent>>)
