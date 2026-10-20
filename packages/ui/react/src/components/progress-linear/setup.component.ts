/**
 * useSetupProgressLinear — setup-слой ProgressLinear (аналог setup.component.ts во Vue).
 *
 * Создаёт adapter-context сборкой useAdapterContext — create(ProgressLinearDescriptor(), ...)
 * и связывает его с React Runtime через useAdapter.
 */

import { ProgressLinearDescriptor } from '@soldy-ui/setup'
import { useAdapter, useAdapterContext } from '../../adapter'
import type { ProgressLinearProps } from './base.component'

export function useSetupProgressLinear(props: ProgressLinearProps) {
	const { contexts: adapter } = useAdapterContext((create) =>
		create(ProgressLinearDescriptor(), { ctrl: props.ctrl, props }),
	)

	// Логики здесь нет: долю, `aria-value*`, `data-indeterminate` и модификатор
	// оси считает ядро, бег рисует тема. Выход `percentStyle` разметка кладёт в
	// `style` корня
	return useAdapter(adapter, props)
}
