import { SwitchDescriptor, TFieldControlExtension } from '@soldy-ui/setup'
import type { ISwitch } from '@soldy-ui/core'
import { AngularElevatorFactory, createAngularAdapterContext, useAdapter } from '../../adapter'
import type { TBinding } from '../../adapter'

/**
 * setupSwitch — setup-слой Switch: собирает компонент
 * (`createAngularAdapterContext`) и связывает его с Angular через useAdapter.
 *
 * Логики здесь нет: переключает значение плагин по `change` поля, а отметку
 * разметка пишет свойством `<input>`.
 *
 * Поле формы `Field` над переключателем: ошибку, `id` и ссылки на части контрол
 * берёт от него своим расширением (`TFieldControlExtension`) — из слоя лифта
 * над собой, а своему содержимому опускает пустую связку в свой слой
 * (`provideElevator()` в его `providers`): контролы в его слотах — его
 * содержимое.
 */
export function setupSwitch(ctrl: ISwitch | undefined, props: object): TBinding<ISwitch> {
	const adapter = createAngularAdapterContext(SwitchDescriptor(), { ctrl, props }).use(
		TFieldControlExtension,
		{ elevator: AngularElevatorFactory },
	)

	return useAdapter(adapter)
}
