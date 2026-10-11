import { ProgressSpinnerDescriptor } from '@soldy-ui/setup'
import type { IProgressSpinner } from '@soldy-ui/core'
import { createAngularAdapterContext, useAdapter } from '../../adapter'
import type { TBinding } from '../../adapter'

/**
 * setupProgressSpinner — setup-слой ProgressSpinner: собирает компонент
 * (`createAngularAdapterContext`) и связывает его с Angular через useAdapter.
 *
 * Логики здесь нет: долю, `aria-value*` и `data-indeterminate` считает ядро,
 * рисунок и бег — тема. Выход `fractionStyle` на корень кладёт база
 * компонента — как стиль-выход, имя которого называет компонент.
 */
export function setupProgressSpinner(
	ctrl: IProgressSpinner | undefined,
	props: object,
): TBinding<IProgressSpinner> {
	const adapter = createAngularAdapterContext(ProgressSpinnerDescriptor(), { ctrl, props })

	return useAdapter(adapter)
}
