import type { ChangeDetectorRef } from '@angular/core'
import { createAdapterContext, TextableDescriptor } from '@soldy/setup'
import type { ITextable, ITextableProps } from '@soldy/core'
import { useAdapter, resolveDefaultExtensions } from '../../adapter'
import type { TAngularBinding } from '../../adapter'

export function setupTextable(
	ctrl: ITextable | undefined,
	props: Partial<ITextableProps>,
	cdr: ChangeDetectorRef,
): TAngularBinding<ITextable> {
	const descriptor = TextableDescriptor()

	const adapter = createAdapterContext(
		descriptor,
		{ ctrl, props },
		{ defaultExtensions: resolveDefaultExtensions(descriptor) },
	)

	return useAdapter<ITextable>(adapter, cdr)
}
