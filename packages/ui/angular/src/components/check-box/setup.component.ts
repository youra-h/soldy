import { CheckBoxDescriptor } from '@soldy-ui/setup'
import type { ICheckBox } from '@soldy-ui/core'
import { createAngularAdapterContext, useAdapter } from '../../adapter'
import type { TBinding } from '../../adapter'

/**
 * setupCheckBox — setup-слой CheckBox: собирает компонент
 * (`createAngularAdapterContext`) и связывает его с Angular через useAdapter.
 *
 * Логики здесь нет: переключает значение плагин флажка по `change` поля, а
 * отметку и «выбрано частично» разметка пишет свойствами `<input>`.
 */
export function setupCheckBox(ctrl: ICheckBox | undefined, props: object): TBinding<ICheckBox> {
	const adapter = createAngularAdapterContext(CheckBoxDescriptor(), { ctrl, props })

	return useAdapter(adapter)
}
