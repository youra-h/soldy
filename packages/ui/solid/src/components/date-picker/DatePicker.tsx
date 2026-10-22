import type { JSX } from 'solid-js'
import { Elevate, ResolvedSlot, createRootProps, roleIcon } from '../../adapter'
import { Show } from '../../adapter/runtime/flow'
import { Button } from '../button'
import { Calendar } from '../calendar'
import { DateInput } from '../date-input'
import { Frame } from '../frame'
import { Icon } from '../icon'
import { setupDatePicker } from './setup.component'
import type { DatePickerProps } from './base.component'

/** Глифы кнопок — компоненты на роль: `tag` у Icon — корень, а не роль. */
const CloseGlyph = roleIcon('close')
const CalendarGlyph = roleIcon('calendar')

/**
 * DatePicker — поле даты и календарь в панели, как Select — поле и список.
 * Корень — `div`, якорь панели: она открывается под ним от его начала, у края
 * окна — над ним. На корне — `id` DatePicker и наборы `attrs`, `rootAria` (у
 * диапазона корень — группа полей концов со своим именем, у одной даты группа
 * — само поле, и набор пуст) и `dataset` (`data-open`, `data-disabled`),
 * поверх — атрибуты потребителя, `ref` адаптера последним.
 *
 * В корне стоит один из режимов — по `mode` (`Show`): поле одной даты или
 * диапазон. Поля, календарь и его движок — экземпляры ядра DatePicker
 * (`ctrl`, `engine`): размер, вариант, `disabled`, локаль, границы и значение
 * им раздаёт ядро, а не разметка, — проброс был бы вторым путём к тем же
 * данным.
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
 * `TActionPlugin` — и гасит всплытие у самого события, как `@click.stop` у
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
 * смонтирован всегда. Якорь — корень (`anchor_anchor` — аксессор адаптера
 * `rootElement`), пометка владельцем (`dismiss_ownerAttribute`) — нажатие в
 * календарь иначе считалось бы нажатием мимо. На панели — `panelAria`
 * (`role="dialog"`, `aria-modal`, имя, `id`) и `panelDataset` (`data-swiping`).
 * Полоса жеста — первой в панели, пока жест включён. Содержимое — обёртка
 * календаря, и прокручивается она, а не панель.
 *
 * Календарь — готовый Calendar над экземпляром и движком ядра. Содержимое дня
 * — слот `item` DatePicker, отданный календарю под тем же именем. Подвал —
 * только при `confirmable` (`Show` в слоте `footer`: без него слот пуст, и
 * строки подвала нет): «Отмена» закрывает панель, а черновик сбрасывает само
 * закрытие, «OK» принимает выбор и выключена посреди диапазона
 * (`confirmDisabled`). Текст — выходы плагина имён (`names_cancel`,
 * `names_confirm`).
 *
 * Обработчиков в разметке больше нет: открытие, дни, листание и шапку панели
 * ловят плагины на корнях.
 *
 * Всё содержимое корня — в слое лифта DatePicker (`Elevate`): поля — детали
 * его разметки — видят пустую связку поля формы, которую DatePicker опускает
 * своему содержимому, а не связку поля над ним. Панель телепортирована, но
 * мемо содержимого `Teleport` собирается под владельцем места, где тот стоит,
 * — внутри `Elevate`.
 */
export function DatePicker(props: DatePickerProps): JSX.Element {
	const binding = setupDatePicker(props)
	const state = binding.state
	const ctrl = binding.ctrl
	// Наборы ядра, поверх — атрибуты снаружи, `ref` адаптера последним
	const root = createRootProps(() => ({
		state,
		sets: [state.attrs, state.rootAria, state.dataset],
		forward: binding.forwardProps(),
	}))

	function clear(event: MouseEvent): void {
		event.stopPropagation()
		ctrl.clear()
	}

	/** Встроенная кнопка очистки — по `clearable`. */
	const clearButton = () => (
		<Show when={state.clearable}>
			<Button
				embedded="date-picker.clear"
				type="button"
				class="so-date-picker__clear"
				size={state.size}
				disabled={state.disabled}
				{...state.clearAria}
				onActionClick={clear}
			>
				<Icon embedded="date-picker.clear-icon" tag={CloseGlyph} size={state.size} />
			</Button>
		</Show>
	)

	/** Очистка — своя кнопка из слота `clear` с командой DatePicker в scope или встроенная. */
	const clearSlot = () => (
		<ResolvedSlot
			content={props.clear}
			scope={() => ({ clear: ctrl.clear })}
			fallback={clearButton()}
		/>
	)

	/** Кнопка календаря: связка с панелью, вид «нажат», значок — слот `trigger-icon`. */
	const trigger = () => (
		<Button
			embedded="date-picker.trigger"
			type="button"
			class="so-date-picker__trigger"
			size={state.size}
			disabled={!state.openable}
			{...state.triggerAria}
			{...state.triggerDataset}
		>
			<ResolvedSlot
				content={props['trigger-icon']}
				fallback={<Icon embedded="date-picker.trigger-icon" tag={CalendarGlyph} />}
			/>
		</Button>
	)

	/** Одна дата: поле с именем DatePicker, очистка и кнопка календаря — в его слотах. */
	const single = () => (
		<DateInput
			embedded="date-picker.field"
			class="so-date-picker__field"
			ctrl={binding.field}
			aria_label={props.aria_label}
			aria_labelledBy={props.aria_labelledBy}
			aria_describedBy={props.aria_describedBy}
			{...state.aria}
			clear={clearSlot()}
			trailing={trigger()}
		/>
	)

	/** Диапазон: поля концов через тире, очистка периода и кнопка календаря. */
	const range = () => (
		<>
			<DateInput
				embedded="date-picker.start"
				class="so-date-picker__start"
				ctrl={binding.start}
				aria_label={state.names_start}
			/>
			<span class="so-date-picker__dash" aria-hidden="true">
				–
			</span>
			<DateInput
				embedded="date-picker.end"
				class="so-date-picker__end"
				ctrl={binding.end}
				aria_label={state.names_end}
			/>
			{clearSlot()}
			{trigger()}
		</>
	)

	/** Подвал календаря — только при `confirmable`: «Отмена», затем «OK». */
	const footer = () => (
		<Show when={state.confirmable}>
			<Button
				embedded="date-picker.cancel"
				type="button"
				class="so-date-picker__cancel"
				size={state.size}
				text={state.names_cancel}
				onClick={() => {
					ctrl.open = false
				}}
			/>
			<Button
				embedded="date-picker.confirm"
				type="button"
				class="so-date-picker__confirm"
				size={state.size}
				disabled={state.confirmDisabled}
				text={state.names_confirm}
				onClick={() => ctrl.confirm()}
			/>
		</Show>
	)

	return (
		<Show when={state.rendered}>
			<div id={state.id} {...root()} ref={binding.ref}>
				<Elevate layer={binding.layer}>
					<Show when={state.mode === 'single'} fallback={range()}>
						{single()}
					</Show>
					<Frame
						embedded="date-picker.frame"
						class="so-date-picker__panel"
						tabindex="-1"
						visible={state.open}
						position="fixed"
						anchor_anchor={binding.rootElement()}
						anchor_offset={4}
						{...state.panelAria}
						{...state.panelDataset}
						{...state.dismiss_ownerAttribute}
					>
						<Show when={state.handleRendered}>
							<div class="so-date-picker__handle" aria-hidden="true" />
						</Show>
						<div class="so-date-picker__content">
							<Calendar
								embedded="date-picker.calendar"
								class="so-date-picker__calendar"
								ctrl={binding.calendar}
								engine={binding.engine}
								item={props.item}
								footer={footer()}
							/>
						</div>
					</Frame>
				</Elevate>
			</div>
		</Show>
	)
}
