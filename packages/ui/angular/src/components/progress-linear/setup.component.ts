import { ProgressLinearDescriptor } from '@soldy-ui/setup'
import type { IProgressLinear } from '@soldy-ui/core'
import { createAngularAdapterContext, useAdapter } from '../../adapter'
import type { TBinding } from '../../adapter'

/**
 * setupProgressLinear — setup-слой ProgressLinear: собирает компонент
 * (`createAngularAdapterContext`) и связывает его с Angular через useAdapter.
 *
 * Логики здесь нет: долю, `aria-value*`, `data-indeterminate` и модификатор
 * оси считает ядро, бег рисует тема. Выход `percentStyle` на корень кладёт
 * база компонента — как стиль-выход, имя которого называет компонент.
 */
export function setupProgressLinear(
	ctrl: IProgressLinear | undefined,
	props: object,
): TBinding<IProgressLinear> {
	const adapter = createAngularAdapterContext(ProgressLinearDescriptor(), { ctrl, props })

	return useAdapter(adapter)
}
