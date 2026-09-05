import type { ChangeDetectorRef } from '@angular/core'
import { createAdapterContext, ComponentViewDescriptor } from '@soldy/setup'
import type { IComponentView, IComponentViewProps } from '@soldy/core'
import { useAdapter, resolveDefaultExtensions } from '../../adapter'
import type { TAngularBinding } from '../../adapter'

export function setupComponentView(
	ctrl: IComponentView | undefined,
	props: Partial<IComponentViewProps>,
	cdr: ChangeDetectorRef,
): TAngularBinding<IComponentView> {
	const descriptor = ComponentViewDescriptor()

	const adapter = createAdapterContext(
		descriptor,
		{ ctrl, props },
		{ defaultExtensions: resolveDefaultExtensions(descriptor) },
	)

	return useAdapter<IComponentView>(adapter, cdr)
}
