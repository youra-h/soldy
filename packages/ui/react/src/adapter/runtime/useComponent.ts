/**
 * useComponent — сборка компонента с одним контекстом: держит его
 * `useAdapterContext` и связывает `useAdapter`. Фабрика собирает контекст в
 * месте вызова (`create(XDescriptor(), …)`, расширения — `.use(...)`): там
 * выводится тип связки. Слой лифта — `layer`, детям его отдаёт `Elevate`.
 */

import type { IAdapterContext, IComponentContract, TElevatorFactory } from '@soldy-ui/setup'
import type { TElevatorLayer } from '../elevator/layer'
import { useAdapter, type TBinding } from './useAdapter'
import { useAdapterContext, type TCreateAdapterContext } from './useAdapterContext'

export type TComponentBinding<C extends IComponentContract, TProps extends object> = TBinding<
	C,
	TProps
> & {
	/** Слой лифта компонента: родительский и то, что опустили расширения. */
	layer: TElevatorLayer
}

export function useComponent<C extends IComponentContract, TProps extends object>(
	factory: (create: TCreateAdapterContext, elevator: TElevatorFactory) => IAdapterContext<C>,
	props: TProps,
): TComponentBinding<C, TProps> {
	const { contexts, layer } = useAdapterContext(factory)

	return { ...useAdapter(contexts, props), layer }
}
