import { CheckBoxDescriptor, TFieldControlExtension } from '@soldy-ui/setup'
import type { ICheckBox } from '@soldy-ui/core'
import { AngularElevatorFactory, createAngularAdapterContext, useAdapter } from '../../adapter'
import type { TBinding } from '../../adapter'

/**
 * setupCheckBox — setup-слой CheckBox: собирает компонент
 * (`createAngularAdapterContext`) и связывает его с Angular через useAdapter.
 *
 * Логики здесь нет: переключает значение плагин флажка по `change` поля, а
 * отметку и «выбрано частично» разметка пишет свойствами `<input>`.
 *
 * Поле формы `Field` над флажком: ошибку, `id` и ссылки на части контрол
 * берёт от него своим расширением (`TFieldControlExtension`) — из слоя лифта
 * над собой, а своему содержимому опускает пустую связку в свой слой
 * (`provideElevator()` в его `providers`): контролы в его слотах — его
 * содержимое.
 */
export function setupCheckBox(ctrl: ICheckBox | undefined, props: object): TBinding<ICheckBox> {
	const adapter = createAngularAdapterContext(CheckBoxDescriptor(), { ctrl, props }).use(
		TFieldControlExtension,
		{ elevator: AngularElevatorFactory },
	)

	return useAdapter(adapter)
}
