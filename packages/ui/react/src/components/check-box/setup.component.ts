/**
 * useSetupCheckBox — setup-слой CheckBox (аналог setup.component.ts во Vue).
 *
 * Создаёт adapter-context через createAdapterContext(CheckBoxDescriptor(), ...)
 * и связывает его с React Runtime через useAdapter.
 */

import { createAdapterContext, CheckBoxDescriptor } from '@soldy-ui/setup'
import { useAdapter, useAdapterContext } from '../../adapter'
import type { CheckBoxProps } from './base.component'

export function useSetupCheckBox(props: CheckBoxProps) {
	const adapter = useAdapterContext(() =>
		createAdapterContext(CheckBoxDescriptor(), { ctrl: props.ctrl, props }),
	)

	return useAdapter(adapter, props)
}
