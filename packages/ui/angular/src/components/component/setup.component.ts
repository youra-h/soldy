import { createAdapterContext, ComponentDescriptor } from '@soldy/setup'
import type { IComponent, IComponentProps } from '@soldy/core'
import { useAdapter } from '../../adapter'
import type { TBinding } from '../../adapter'

/**
 * setupComponent — создаёт adapter-context для компонента Component
 * и связывает его с Angular через useAdapter.
 *
 * Вызывается из ngOnInit() Angular-компонента.
 */
export function setupComponent(
	ctrl: IComponent | undefined,
	props: Partial<IComponentProps>,
): TBinding<IComponent> {
	const adapter = createAdapterContext(ComponentDescriptor(), { ctrl, props })

	return useAdapter<IComponent>(adapter)
}
