import type { ChangeDetectorRef } from '@angular/core'
import { createAdapterContext, StylableDescriptor } from '@soldy/setup'
import type { IStylable, IStylableProps } from '@soldy/core'
import { useAdapter, resolveDefaultExtensions } from '../../adapter'
import type { TAngularBinding } from '../../adapter'

export function setupStylable(
	ctrl: IStylable | undefined,
	props: Partial<IStylableProps>,
	cdr: ChangeDetectorRef,
): TAngularBinding<IStylable> {
	const descriptor = StylableDescriptor()

	const adapter = createAdapterContext(
		descriptor,
		{ ctrl, props },
		{ defaultExtensions: resolveDefaultExtensions(descriptor) },
	)

	return useAdapter<IStylable>(adapter, cdr)
}
