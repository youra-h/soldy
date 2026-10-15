import { LabelDescriptor } from '@soldy-ui/setup'
import type { ILabel } from '@soldy-ui/core'
import { createAngularAdapterContext, useAdapter } from '../../adapter'
import type { TBinding } from '../../adapter'

/**
 * setupLabel — setup-слой Label: собирает компонент
 * (`createAngularAdapterContext`) и связывает его с Angular через useAdapter.
 *
 * Логики здесь нет: модификаторы стороны, размера и варианта считает ядро, а
 * на корень их кладёт база компонента; о вложенном `label` предупреждает
 * плагин подписи.
 */
export function setupLabel(ctrl: ILabel | undefined, props: object): TBinding<ILabel> {
	const adapter = createAngularAdapterContext(LabelDescriptor(), { ctrl, props })

	return useAdapter(adapter)
}
