/**
 * useSetupProgressSpinner — setup-слой ProgressSpinner (аналог setup.component.ts во Vue).
 *
 * Создаёт adapter-context сборкой useAdapterContext — create(ProgressSpinnerDescriptor(), ...)
 * и связывает его с React Runtime через useAdapter.
 */

import { ProgressSpinnerDescriptor } from '@soldy-ui/setup'
import { useAdapter, useAdapterContext } from '../../adapter'
import type { ProgressSpinnerProps } from './base.component'

export function useSetupProgressSpinner(props: ProgressSpinnerProps) {
	const { contexts: adapter } = useAdapterContext((create) =>
		create(ProgressSpinnerDescriptor(), { ctrl: props.ctrl, props }),
	)

	// Логики здесь нет: долю, `aria-value*` и `data-indeterminate` считает ядро,
	// рисунок и бег — тема. Выход `fractionStyle` разметка кладёт в `style` корня
	return useAdapter(adapter, props)
}
