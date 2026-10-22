/**
 * setupDatePicker — setup-слой DatePicker.
 *
 * Создаёт adapter-context (`createSvelteAdapterContext`) и связывает его со
 * Svelte через useAdapter. Вызывается один раз при инициализации компонента,
 * поэтому контекст достаточно положить в обычную константу. Id монтирования
 * (`$props.id()`) и приёмник корня (`receive`) отдаёт компонент: компилятор
 * пускает `$props.id()` и `$bindable` только туда.
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
 * пустую (`setContext`).
 *
 * Разметке отдаёт ещё две вещи. Якорь панели — `rootElement` связки, геттером
 * над руной адаптера: разметка следит за ним, как за состоянием. Поля,
 * календарь и движок его коллекции — экземпляры ядра на всю жизнь
 * DatePicker, а не пропсы: разметка отдаёт их компонентам целиком (`ctrl`,
 * `engine`), как Select — своё поле. Связку `useAdapter` разметке не спредом,
 * а поимённо: её `forwardProps` и `rootElement` — геттеры, и спред прочёл бы их
 * один раз.
 */

import { DatePickerDescriptor, TFieldControlExtension } from '@soldy-ui/setup'
import {
	createSvelteAdapterContext,
	useAdapter,
	useElevator,
	type TRootReceiver,
} from '../../adapter'
import type { DatePickerProps } from './base.component'

export function setupDatePicker(
	getProps: () => DatePickerProps,
	mountId: string,
	receive: TRootReceiver,
) {
	const elevator = useElevator()
	const adapter = createSvelteAdapterContext(DatePickerDescriptor(), {
		ctrl: getProps().ctrl,
		props: getProps(),
		mountId,
	}).use(TFieldControlExtension, { elevator })
	const picker = adapter.instance

	// Выход `dismiss_ownerAttribute` разметка кладёт спредом на панель
	const binding = useAdapter(adapter, getProps, receive)

	return {
		ctrl: binding.ctrl,
		plugins: binding.plugins,
		state: binding.state,
		attachElement: binding.attachElement,
		field: picker.field,
		start: picker.start,
		end: picker.end,
		calendar: picker.calendar,
		engine: picker.engine,

		get forwardProps() {
			return binding.forwardProps
		},

		get rootElement() {
			return binding.rootElement
		},
	}
}
