/**
 * A closed instance: what a consumer's `ref` sees of a component.
 *
 * A component has two surfaces of control — props with events, and `ctrl`
 * (AGENTS.md, «Две поверхности управления»), — and `ref` is the way to the
 * root, `$el`, not a third one. So the instance is closed from outside: it
 * gives the properties of Vue (`$el`, `$props`, `$slots`…), but not the
 * bindings of the template — `ctrl`, the state, the outputs of plugins. Vue
 * gives the root `$el` itself, and to a component whose template root is a
 * teleport, `exposeRoot` does.
 *
 * Two records close it, the run time and the type, and both are needed:
 * vue-tsc checks the template of a component by the public type of its
 * instance, so an option the type saw would close the template too.
 *
 * - `useExpose()` — the `expose` option of a component (`setup.component.ts`),
 *   closes the instance at run time;
 * - `TClosedComponent` — the type of a component where it is exported, closes
 *   the instance in the type.
 */

import type { ComponentCustomProperties, ComponentPublicInstance } from 'vue'

/**
 * The `expose` option of a component: an empty list — the instance gives
 * nothing but the properties of Vue.
 *
 * Each component has its own: Vue does not take it from `extends` (it warns
 * and ignores it), so `base.component.ts` has none.
 *
 * The type is `string[]`, not an empty tuple: from `expose: []` vue-tsc would
 * infer the closed type of the instance, and it checks the template of the
 * component by that type too — every binding would vanish from the template.
 * `TClosedComponent` closes the type.
 */
export function useExpose(): string[] {
	return []
}

/**
 * The keys of the properties of a type, without its signatures. `keyof` takes
 * a signature for a key as well, and a pattern one absorbs every key it
 * matches: a union of `'$props'` and `` `$${string}` `` is the pattern alone.
 * Nuxt gives such a signature to the global properties of every app (the
 * injections of its plugins), and the properties of Vue minus `keyof` of them
 * were none — `$props` among them. A mapped type over `keyof T` walks the
 * properties one by one; a signature is a key that an empty object satisfies.
 */
type TPropertyKeys<T> = keyof {
	[K in keyof T as Record<never, never> extends Record<K, unknown> ? never : K]: T[K]
}

/**
 * The properties Vue gives at a closed instance: `$el`, `$props`, `$slots`,
 * `$emit`… The global properties of the app (`ComponentCustomProperties`) a
 * closed instance does not give.
 */
type TInstanceKeys = Exclude<
	TPropertyKeys<ComponentPublicInstance>,
	TPropertyKeys<ComponentCustomProperties>
>

/** A closed instance in the type: only the properties of Vue, no bindings of the template. */
export type TClosedInstance<TInstance extends ComponentPublicInstance> = Pick<
	TInstance,
	TInstanceKeys
>

/**
 * A component whose instance is closed (`useExpose`): its props, events and
 * slots are as before — vue-tsc takes them from `$props`, `$emit` and
 * `$slots`, — and the instance from a `ref` is typed by the properties of Vue.
 *
 * The type is set where the component is exported, not by an option: the
 * template needs the open type, the consumer the closed one (see the head of
 * the file). There is no cast here: the open instance is a subtype of the
 * closed one, and the component is assignable to this type as it is, under
 * the check of the compiler.
 *
 * The constructor is replaced whole (`Omit` drops the signature of the
 * original): with two `new` signatures the original, open one would be chosen.
 */
export type TClosedComponent<TComponent extends new (...args: any[]) => ComponentPublicInstance> =
	Omit<TComponent, never> & (new (...args: any[]) => TClosedInstance<InstanceType<TComponent>>)
