import { NumberInputDescriptor, TFieldControlExtension } from '@soldy-ui/setup'
import type { INumberInput } from '@soldy-ui/core'
import { AngularElevatorFactory, createAngularAdapterContext, useAdapter } from '../../adapter'
import type { TBinding } from '../../adapter'

/**
 * setupNumberInput — setup-слой NumberInput: собирает компонент
 * (`createAngularAdapterContext`) и связывает его с Angular через useAdapter.
 *
 * Логики здесь нет: что набирается, решает ядро, правку браузера до него
 * доводит плагин набора, клавиши шага и кнопки шага с удержанием — свои
 * плагины на корне, имена кнопок очистки и шага пишет плагин имён по локали
 * поддерева, язык формата — плагин языка.
 *
 * Поле формы `Field` над полем: ошибку, `id` и ссылки на части контрол
 * берёт от него своим расширением (`TFieldControlExtension`) — из слоя лифта
 * над собой, а в свой слой (`provideElevator()` в его `providers`) опускает
 * пустую связку, как Input: контролы в его слотах — его содержимое.
 */
export function setupNumberInput(
	ctrl: INumberInput | undefined,
	props: object,
): TBinding<INumberInput> {
	const adapter = createAngularAdapterContext(NumberInputDescriptor(), { ctrl, props }).use(
		TFieldControlExtension,
		{ elevator: AngularElevatorFactory },
	)

	return useAdapter(adapter)
}
