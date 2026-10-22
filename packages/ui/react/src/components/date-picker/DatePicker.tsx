import type { ReactElement, ReactNode } from 'react'
import { Elevate, renderSlot, roleIcon, toAriaProps, toRootProps } from '../../adapter'
import { Button } from '../button'
import { Calendar } from '../calendar'
import { DateInput } from '../date-input'
import { Frame } from '../frame'
import { Icon } from '../icon'
import { useSetupDatePicker } from './setup.component'
import type { DatePickerProps } from './base.component'

/** Глифы кнопок — компоненты на роль, один на модуль (`roleIcon`). */
const CloseMark = roleIcon('close')
const CalendarMark = roleIcon('calendar')

/**
 * DatePicker — поле даты и календарь в панели, как Select — поле и список.
 * Корень — `div`, якорь панели: она открывается под ним от его начала, у края
 * окна — над ним. На корне — `id` DatePicker и наборы `attrs`, `rootAria` (у
 * диапазона корень — группа полей концов со своим именем, у одной даты группа
 * — само поле, и набор пуст) и `dataset` (`data-open`, `data-disabled`),
 * поверх — атрибуты потребителя целиком, `ref` адаптера последним.
 *
 * В корне стоит один из режимов — по `mode`: поле одной даты или диапазон.
 * Поля, календарь и его движок — экземпляры ядра DatePicker (`ctrl`,
 * `engine`): размер, вариант, `disabled`, локаль, границы и значение им
 * раздаёт ядро, а не разметка, — проброс был бы вторым путём к тем же данным.
 * Ключ каждого — его экземпляр: без `ctrl` пересобранный DatePicker
 * (StrictMode, `<Activity>`) — новый инстанс с новыми полями, календарём и
 * движком, а поле и календарь через лифт ничего меняющегося не читают и сами
 * не пересоберутся, — без ключа они остались бы над прежними экземплярами, и
 * набор в поле не дошёл бы до значения.
 *
 * Одна дата — готовый DateInput: коробка, части, кольцо фокуса и ошибка — его.
 * Поле и есть группа частей, поэтому имя DatePicker (`aria_label`,
 * `aria_labelledBy`, `aria_describedBy`) уходит ему: так оно дойдёт и до
 * частей там, где группы скринридер не объявляет. Набор `aria` DatePicker
 * ложится на поле атрибутами, поверх его собственного: в нём и то, что
 * DatePicker'у даёт поле формы `Field`, — ссылки на подпись и справку и
 * ошибка. Кнопки очистки и календаря — в слотах поля `clear` и `trailing`, в
 * этом порядке: обёртку слотов у конца поля держит тема DateInput. Свою
 * очистку поле не рисует: `clearable` ему не уходит.
 *
 * Диапазон — поле начала, тире под `aria-hidden`, поле конца и кнопки — одна
 * коробка на корне. Поля называют свои концы сами — именами `names_start` и
 * `names_end`, выходами плагина имён. Кнопки — после поля конца, а не в его
 * слоте: они работают со всем периодом.
 *
 * Кнопка очистки — DatePicker'а, одна на значение: по `clearable`, выключена
 * вместе с DatePicker, `readonly` её не гасит. Имя ядро собирает с именем
 * DatePicker (`clearAria`), очищает его команда `clear` — у диапазона оба
 * конца. Очищает кнопка по `onActionClick` — нативному клику её
 * `TActionPlugin` — и гасит всплытие у нативного события, как `@click.stop` у
 * Vue. Своя кнопка — слот `clear` DatePicker'а с его командой в scope:
 * заменяет встроенную целиком. Полю она уходит готовыми узлами, а не функцией
 * слота: функцию поле позвало бы со своим scope, со своей командой `clear`.
 *
 * Кнопка календаря — связка с панелью и имя (`triggerAria`), вид «нажат»
 * (`triggerDataset`), выключена, когда открыть панель нельзя. Нажатие ловит
 * плагин открытия на корне. Значок — слот `trigger-icon`, иначе иконка роли
 * `calendar` без своего размера: по кеглю кнопки.
 *
 * Панель — Frame, телепорт в `body`: открытость — `visible` панели, как у
 * Select, закрытая панель прячется, а не размонтируется, и календарь в ней
 * смонтирован всегда. Якорь — корень значением рендера (`rootElement` от
 * `useRootElement`): `null` на сервере и до коммита, узел после. Пометка
 * владельцем (`dismiss_ownerAttribute`) — нажатие в календарь иначе считалось
 * бы нажатием мимо. На панели — `panelAria` (`role="dialog"`, `aria-modal`,
 * имя, `id`) и `panelDataset` (`data-swiping`); `tabIndex={-1}` — фокус встаёт
 * на саму панель, когда внутри нечего фокусировать. Полоса жеста — первой в
 * панели, пока жест включён. Содержимое — обёртка календаря, и прокручивается
 * она, а не панель. На сервере портала нет — панели и календаря в серверной
 * разметке нет, они появляются после гидратации.
 *
 * Календарь — готовый Calendar над экземпляром и движком ядра. Содержимое дня
 * — слот `item` DatePicker, отданный календарю под тем же именем. Подвал —
 * только при `confirmable`: «Отмена» закрывает панель, а черновик сбрасывает
 * само закрытие, «OK» принимает выбор и выключена посреди диапазона
 * (`confirmDisabled`). Текст — выходы плагина имён (`names_cancel`,
 * `names_confirm`).
 *
 * Обработчиков в разметке больше нет: открытие, дни, листание и шапку панели
 * ловят плагины на корнях.
 *
 * Всё содержимое корня — в слое лифта DatePicker (`Elevate`): поля — детали
 * его разметки — видят пустую связку поля формы, которую DatePicker опускает
 * своему содержимому, а не связку поля над ним. Портал React контекст
 * сохраняет, поэтому слой видит и календарь в телепортированной панели.
 */
export function DatePicker(props: DatePickerProps): ReactElement | null {
	const {
		ctrl,
		ref,
		forwardProps,
		state,
		layer,
		rootElement,
		field,
		start,
		end,
		calendar,
		engine,
	} = useSetupDatePicker(props)

	const {
		rendered,
		id,
		attrs,
		aria,
		rootAria,
		dataset,
		mode,
		size,
		disabled,
		clearable,
		clearAria,
		openable,
		triggerAria,
		triggerDataset,
		open,
		panelAria,
		panelDataset,
		handleRendered,
		confirmable,
		confirmDisabled,
		names_start,
		names_end,
		names_cancel,
		names_confirm,
		dismiss_ownerAttribute,
	} = state

	if (!rendered) return null

	/** Очистка — своя кнопка из слота `clear` с командой DatePicker в scope или встроенная. */
	const clear: ReactNode =
		renderSlot(props.clear, { clear: ctrl.clear }) ??
		(clearable === true ? (
			<Button
				embedded="date-picker.clear"
				type="button"
				className="so-date-picker__clear"
				size={size}
				disabled={disabled}
				{...toAriaProps(clearAria)}
				onActionClick={(event) => {
					event.stopPropagation()
					ctrl.clear()
				}}
			>
				<Icon embedded="date-picker.clear-icon" tag={CloseMark} size={size} />
			</Button>
		) : null)

	/** Кнопка календаря: связка с панелью, вид «нажат», значок — слот `trigger-icon`. */
	const trigger = (
		<Button
			embedded="date-picker.trigger"
			type="button"
			className="so-date-picker__trigger"
			size={size}
			disabled={!openable}
			{...toAriaProps(triggerAria)}
			{...toAriaProps(triggerDataset)}
		>
			{renderSlot(props['trigger-icon']) ?? (
				<Icon embedded="date-picker.trigger-icon" tag={CalendarMark} />
			)}
		</Button>
	)

	/** Подвал календаря — только при `confirmable`: «Отмена», затем «OK». */
	const footer =
		confirmable === true ? (
			<>
				<Button
					embedded="date-picker.cancel"
					type="button"
					className="so-date-picker__cancel"
					size={size}
					text={names_cancel}
					onClick={() => {
						ctrl.open = false
					}}
				/>
				<Button
					embedded="date-picker.confirm"
					type="button"
					className="so-date-picker__confirm"
					size={size}
					disabled={confirmDisabled}
					text={names_confirm}
					onClick={() => ctrl.confirm()}
				/>
			</>
		) : undefined

	// Наборы ядра, поверх — атрибуты снаружи, `ref` адаптера последним
	return (
		<div id={id} {...toRootProps(ref, state, [attrs, rootAria, dataset], forwardProps)}>
			<Elevate layer={layer}>
				{mode === 'single' ? (
					<DateInput
						key={field.uid}
						embedded="date-picker.field"
						className="so-date-picker__field"
						ctrl={field}
						aria_label={props.aria_label}
						aria_labelledBy={props.aria_labelledBy}
						aria_describedBy={props.aria_describedBy}
						{...toAriaProps(aria)}
						clear={clear}
						trailing={trigger}
					/>
				) : (
					<>
						<DateInput
							key={start.uid}
							embedded="date-picker.start"
							className="so-date-picker__start"
							ctrl={start}
							aria_label={names_start}
						/>
						<span className="so-date-picker__dash" aria-hidden="true">
							–
						</span>
						<DateInput
							key={end.uid}
							embedded="date-picker.end"
							className="so-date-picker__end"
							ctrl={end}
							aria_label={names_end}
						/>
						{clear}
						{trigger}
					</>
				)}
				<Frame
					embedded="date-picker.frame"
					className="so-date-picker__panel"
					tabIndex={-1}
					visible={open}
					position="fixed"
					anchor_anchor={rootElement}
					anchor_offset={4}
					{...toAriaProps(panelAria)}
					{...toAriaProps(panelDataset)}
					{...toAriaProps(dismiss_ownerAttribute)}
				>
					{handleRendered ? (
						<div className="so-date-picker__handle" aria-hidden="true" />
					) : null}
					<div className="so-date-picker__content">
						<Calendar
							key={calendar.uid}
							embedded="date-picker.calendar"
							className="so-date-picker__calendar"
							ctrl={calendar}
							engine={engine}
							item={props.item}
							footer={footer}
						/>
					</div>
				</Frame>
			</Elevate>
		</div>
	)
}
