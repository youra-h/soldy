import { DateInputDescriptor, TFieldControlExtension } from '@soldy-ui/setup'
import type { IDateInput } from '@soldy-ui/core'
import { AngularElevatorFactory, createAngularAdapterContext, useAdapter } from '../../adapter'
import type { TBinding } from '../../adapter'

/**
 * setupDateInput — setup-слой DateInput: собирает компонент
 * (`createAngularAdapterContext`) и связывает его с Angular через useAdapter.
 *
 * Логики здесь нет: части, их текст и наборы отдаёт ядро, клавиши, указатель,
 * буфер обмена и касание ловят плагины поля на корне, язык формата пишет
 * плагин языка по локали поддерева, имя кнопки очистки — плагин имён поля,
 * `id` частей — плагин связок от монтирования.
 *
 * Поле формы `Field` над полем: ошибку и ссылки на подпись и справку контрол
 * берёт от него своим расширением (`TFieldControlExtension`) — из слоя лифта
 * над собой, а своему содержимому опускает пустую связку в свой слой
 * (`provideElevator()` в его `providers`): контролы в его слотах — его
 * содержимое.
 */
export function setupDateInput(ctrl: IDateInput | undefined, props: object): TBinding<IDateInput> {
	const adapter = createAngularAdapterContext(DateInputDescriptor(), { ctrl, props }).use(
		TFieldControlExtension,
		{ elevator: AngularElevatorFactory },
	)

	return useAdapter(adapter)
}
