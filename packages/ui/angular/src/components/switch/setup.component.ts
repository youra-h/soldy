import { SwitchDescriptor } from '@soldy-ui/setup'
import type { ISwitch } from '@soldy-ui/core'
import { createAngularAdapterContext, useAdapter } from '../../adapter'
import type { TBinding } from '../../adapter'

/**
 * setupSwitch — setup-слой Switch: собирает компонент
 * (`createAngularAdapterContext`) и связывает его с Angular через useAdapter.
 *
 * Логики здесь нет: переключает значение плагин по `change` поля, а отметку
 * разметка пишет свойством `<input>`.
 */
export function setupSwitch(ctrl: ISwitch | undefined, props: object): TBinding<ISwitch> {
	const adapter = createAngularAdapterContext(SwitchDescriptor(), { ctrl, props })

	return useAdapter(adapter)
}
