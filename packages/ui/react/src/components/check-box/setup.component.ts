/**
 * useSetupCheckBox — setup-слой CheckBox (аналог setup.component.ts во Vue).
 *
 * Создаёт adapter-context сборкой useAdapterContext — create(CheckBoxDescriptor(), ...)
 * и связывает его с React Runtime через useAdapter.
 */

import { CheckBoxDescriptor } from '@soldy-ui/setup'
import { useAdapter, useAdapterContext } from '../../adapter'
import type { CheckBoxProps } from './base.component'

export function useSetupCheckBox(props: CheckBoxProps) {
	const adapter = useAdapterContext((create) =>
		create(CheckBoxDescriptor(), { ctrl: props.ctrl, props }),
	)

	return useAdapter(adapter, props)
}
