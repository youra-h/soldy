/**
 * useSetupDatePicker — setup-слой DatePicker (аналог setup.component.ts во Vue).
 *
 * Создаёт adapter-context сборкой useAdapterContext — create(DatePickerDescriptor(), ...)
 * и связывает его с React Runtime через useAdapter.
 *
 * Логики здесь нет, как у Vue: общее полям и календарю, значение, открытость
 * и подтверждение выбора держит ядро DatePicker, очищает его команда `clear`,
 * кнопку календаря и Alt+↓ ловит плагин открытия, нажатие мимо —
 * `TDismissPlugin`, фокус панели — плагин фокуса, жест — `TSwipePlugin`.
 * Разметка раскладывает то, что они отдали.
 *
 * Поле формы `Field` над DatePicker связывается с ним, а не с его полями:
 * поля — детали его разметки (`embedded`), и связку DatePicker берёт своим
 * расширением (`TFieldControlExtension`), а своему содержимому опускает
 * пустую лифтом компонента. Детям слой лифта (`layer`) отдаёт `Elevate` в
 * разметке.
 *
 * Разметке отдаёт ещё две вещи. Якорь панели — корень значением рендера: его
 * отдаёт хук адаптера `useRootElement` — `null` на сервере и до коммита, узел
 * после, — как `rootElement` у Vue. Поля, календарь и движок его коллекции —
 * экземпляры ядра на всю жизнь DatePicker, а не пропсы: разметка отдаёт их
 * компонентам целиком (`ctrl`, `engine`), как Select — своё поле. Берутся они
 * у инстанса текущей сборки: без `ctrl` пересобранный DatePicker (StrictMode,
 * `<Activity>`) — новый инстанс с новыми полями, календарём и движком.
 */

import { DatePickerDescriptor, TFieldControlExtension } from '@soldy-ui/setup'
import { useAdapter, useAdapterContext, useRootElement } from '../../adapter'
import type { DatePickerProps } from './base.component'

export function useSetupDatePicker(props: DatePickerProps) {
	const { contexts: adapter, layer } = useAdapterContext((create, elevator) =>
		create(DatePickerDescriptor(), { ctrl: props.ctrl, props }).use(TFieldControlExtension, {
			elevator,
		}),
	)

	// Выход `dismiss_ownerAttribute` разметка раскладывает на панель
	const binding = useAdapter(adapter, props)
	const picker = adapter.instance

	return {
		...binding,
		layer,
		rootElement: useRootElement(binding.root),
		field: picker.field,
		start: picker.start,
		end: picker.end,
		calendar: picker.calendar,
		engine: picker.engine,
	}
}
