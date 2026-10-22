import { ProgressSpinnerDescriptor } from '@soldy-ui/setup'
import type { IProgressSpinner } from '@soldy-ui/core'
import { createAngularAdapterContext, useAdapter } from '../../adapter'
import type { TBinding } from '../../adapter'

export function setupProgressSpinner(
	ctrl: IProgressSpinner | undefined,
	props: object,
): TBinding<IProgressSpinner> {
	const adapter = createAngularAdapterContext(ProgressSpinnerDescriptor(), { ctrl, props })

	return useAdapter(adapter)
}
