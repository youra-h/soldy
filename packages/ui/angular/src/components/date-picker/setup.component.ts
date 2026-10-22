import { DatePickerDescriptor, TFieldControlExtension } from '@soldy-ui/setup'
import type { IDatePicker } from '@soldy-ui/core'
import { AngularElevatorFactory, createAngularAdapterContext, useAdapter } from '../../adapter'
import type { TBinding } from '../../adapter'

/**
 * setupDatePicker — setup-слой DatePicker: собирает компонент
 * (`createAngularAdapterContext`) и связывает его с Angular через useAdapter.
 *
 * Логики здесь нет: общее полям и календарю, значение, открытость и
 * подтверждение выбора держит ядро DatePicker, очищает его команда `clear`,
 * кнопку календаря и Alt+↓ ловит `TDatePickerTriggerPlugin`, нажатие мимо —
 * `TDismissPlugin`, фон под панелью прячет `THideOutsidePlugin`, фокус панели —
 * `TDatePickerFocusPlugin`, жест — `TSwipePlugin`, `id` панели и связку
 * кнопки — `TDatePickerIdsPlugin`, имена кнопок, панели, концов и текст
 * кнопок подвала — `TDatePickerNamesPlugin` по локали поддерева. Разметка
 * раскладывает то, что они отдали; выход `dismiss_ownerAttribute` шаблон
 * кладёт на панель.
 *
 * Поле формы `Field` над DatePicker связывается с ним, а не с его полями: поля
 * — детали его разметки (`embedded`), и связку поля формы они не берут.
 * Связку DatePicker берёт своим расширением (`TFieldControlExtension`) из слоя
 * лифта над собой, а своему содержимому опускает пустую — в свой слой
 * (`provideElevator()` в его `providers`): поля, календарь и контролы в
 * слотах — его содержимое.
 */
export function setupDatePicker(
	ctrl: IDatePicker | undefined,
	props: object,
): TBinding<IDatePicker> {
	const adapter = createAngularAdapterContext(DatePickerDescriptor(), { ctrl, props }).use(
		TFieldControlExtension,
		{ elevator: AngularElevatorFactory },
	)

	return useAdapter(adapter)
}
