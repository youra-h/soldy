import type { ChangeDetectorRef } from '@angular/core'
import { createAdapterContext, ControlDescriptor } from '@soldy/setup'
import type { IControl, IControlProps } from '@soldy/core'
import { useAdapter, resolveDefaultExtensions } from '../../adapter'
import type { TAngularBinding } from '../../adapter'

export function setupControl(
	ctrl: IControl | undefined,
	props: Partial<IControlProps>,
	cdr: ChangeDetectorRef,
): TAngularBinding<IControl> {
	const descriptor = ControlDescriptor()

	const adapter = createAdapterContext(
		descriptor,
		{ ctrl, props },
		{ defaultExtensions: resolveDefaultExtensions(descriptor) },
	)

	return useAdapter<IControl>(adapter, cdr)
}
