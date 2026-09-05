import type { ChangeDetectorRef } from '@angular/core'
import { createAdapterContext, ButtonDescriptor } from '@soldy/setup'
import type { IButton, IButtonProps } from '@soldy/core'
import { useAdapter, resolveDefaultExtensions } from '../../adapter'
import type { TAngularBinding } from '../../adapter'

export function setupButton(
	ctrl: IButton | undefined,
	props: Partial<IButtonProps>,
	cdr: ChangeDetectorRef,
): TAngularBinding<IButton> {
	const descriptor = ButtonDescriptor()

	const adapter = createAdapterContext(
		descriptor,
		{ ctrl, props },
		{ defaultExtensions: resolveDefaultExtensions(descriptor) },
	)

	return useAdapter<IButton>(adapter, cdr)
}
