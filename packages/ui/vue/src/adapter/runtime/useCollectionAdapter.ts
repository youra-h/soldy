import type { IAdapterContext, IComponentContract } from '@soldy-ui/setup'
import type { IPluginBundle } from '@soldy-ui/plugins'
import { toBindingState, useAdapterParts, type TBindingState } from './useAdapter'
import { bindingOf } from './view'

/**
 * The same as `TBinding`, without `ctrl` and `rootElement`.
 *
 * `TProps` are the component's props, the collection ones among them; the
 * instance of the contract `C` is the facade. From them the template gets the
 * types of `items`, `selected` and the rest the collection hands over.
 *
 * Built as an intersection, not through `Omit<TBinding, …>`: `Omit` flattens
 * the intersection, and `items` of the declared prop stops merging with
 * `items` of the facade — the template sees a union without `uid`.
 */
export type TCollectionBinding<C extends IComponentContract, TProps> = {
	plugins: IPluginBundle | null
} & TBindingState<C, TProps>

/**
 * The adapter of a collection facade — the facade of the owner and of an item:
 * everything `useAdapter` does except what belongs to the component.
 *
 * - `ctrl` of a facade would be the `T*CollectionFacade`, while the template
 *   waits for the component under that name;
 * - a facade has no root: it shares the component's bundle and has no node of
 *   its own, so it gets neither a root ref nor a `watch` on it — a ref the
 *   template never bound, on every item and owner of a collection.
 *
 * `plugins` stays: it is the **same** bundle for both contexts — the second
 * one is created with `{ bundle: adapter.bundle }`.
 *
 * The component joins its binding with the facades' in `joinBindings` — one
 * view, its fields first, then the states in order.
 */
export function useCollectionAdapter<C extends IComponentContract, TProps extends object>(
	adapter: IAdapterContext<C>,
	props: TProps,
	emit?: (event: string, ...args: unknown[]) => void,
): TCollectionBinding<C, TProps> {
	const state = toBindingState<C, TProps>(useAdapterParts(adapter, props, emit))

	return bindingOf({ plugins: adapter.bundle }, state)
}
