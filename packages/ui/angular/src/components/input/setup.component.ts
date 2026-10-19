import { InputDescriptor, TFieldControlExtension } from '@soldy-ui/setup'
import type { IInput } from '@soldy-ui/core'
import { AngularElevatorFactory, createAngularAdapterContext, useAdapter } from '../../adapter'
import type { TBinding } from '../../adapter'

/**
 * setupInput — setup-слой Input: собирает компонент
 * (`createAngularAdapterContext`) и связывает его с Angular через useAdapter.
 *
 * Логики здесь нет: текст в ядро несёт плагин ввода по `input` поля, имя
 * кнопки очистки (`clearAria`) пишет плагин имён формы по локали поддерева.
 *
 * Поле формы `Field` над полем: ошибку, `id` и ссылки на части контрол
 * берёт от него своим расширением (`TFieldControlExtension`) — из слоя лифта
 * над собой, а своему содержимому опускает пустую связку в свой слой
 * (`provideElevator()` в его `providers`): контролы в его слотах — его
 * содержимое.
 */
export function setupInput(ctrl: IInput | undefined, props: object): TBinding<IInput> {
	const adapter = createAngularAdapterContext(InputDescriptor(), { ctrl, props }).use(
		TFieldControlExtension,
		{ elevator: AngularElevatorFactory },
	)

	return useAdapter(adapter)
}
