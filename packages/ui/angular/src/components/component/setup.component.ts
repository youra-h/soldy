import type { ChangeDetectorRef } from '@angular/core'
import { createAdapterContext, ComponentDescriptor } from '@soldy/setup'
import type { IComponent, IComponentProps } from '@soldy/core'
import { useAdapter, resolveDefaultExtensions } from '../../adapter'
import type { TAngularBinding } from '../../adapter'

/**
 * setupComponent — создаёт adapter-context для компонента Component
 * и связывает его с Angular через useAdapter.
 *
 * Вызывается из ngOnInit() Angular-компонента.
 */
export function setupComponent(
	ctrl: IComponent | undefined,
	props: Partial<IComponentProps>,
	cdr: ChangeDetectorRef,
): TAngularBinding<IComponent> {
	const descriptor = ComponentDescriptor()

	const adapter = createAdapterContext(
		descriptor,
		{ ctrl, props },
		{ defaultExtensions: resolveDefaultExtensions(descriptor) },
	)

	return useAdapter<IComponent>(adapter, cdr)
}
