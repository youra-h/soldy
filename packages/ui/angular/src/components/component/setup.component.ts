import { ComponentDescriptor } from '@soldy-ui/setup'
import type { IComponent } from '@soldy-ui/core'
import { createAngularAdapterContext, useAdapter } from '../../adapter'
import type { TBinding } from '../../adapter'

/**
 * setupComponent — создаёт adapter-context для компонента Component
 * (`createAngularAdapterContext`) и связывает его с Angular через useAdapter.
 *
 * Вызывается из ngOnInit() Angular-компонента, в контексте его инъекции: из
 * него обёртка сборки берёт локаль поддерева.
 */
export function setupComponent(ctrl: IComponent | undefined, props: object): TBinding<IComponent> {
	const adapter = createAngularAdapterContext(ComponentDescriptor(), { ctrl, props })

	return useAdapter(adapter)
}
