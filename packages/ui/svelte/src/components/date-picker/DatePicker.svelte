<script lang="ts">
	import { Dynamic, roleIcon, toRootProps } from '../../adapter'
	import { Button } from '../button'
	import { Calendar } from '../calendar'
	import { DateInput } from '../date-input'
	import { Frame } from '../frame'
	import { Icon } from '../icon'
	import { setupDatePicker } from './setup.component'
	import type { DatePickerProps } from './base.component'

	let { ref = $bindable(), ...props }: DatePickerProps = $props()
	const mountId = $props.id()

	const binding = setupDatePicker(() => props, mountId, (node) => (ref = node))
	const state = binding.state
	const ctrl = binding.ctrl

	// Глифы кнопок — метки ролей: `tag` у Icon — корень, а не роль
	const CLOSE = roleIcon('close')
	const CALENDAR = roleIcon('calendar')

	/**
	 * Клик кнопки очистки — нативный клик её `TActionPlugin` (`onActionClick`):
	 * всплытие гасится у самого события, как `@click.stop` у Vue.
	 */
	function clear(event: MouseEvent): void {
		event.stopPropagation()
		ctrl.clear()
	}

	/** «Отмена» только закрывает панель: черновик выбора сбрасывает само закрытие. */
	function cancel(): void {
		ctrl.open = false
	}

	/** «OK» делает черновик выбора значением и закрывает панель. */
	function confirm(): void {
		ctrl.confirm()
	}
</script>

<!--
	DatePicker — поле даты и календарь в панели, как Select — поле и список, как
	у Vue. Корень — `div`, якорь панели: она открывается под ним от его начала,
	у края окна — над ним. На корне — `id` DatePicker и наборы `attrs`,
	`rootAria` (у диапазона корень — группа полей концов со своим именем, у
	одной даты группа — само поле, и набор пуст) и `dataset` (`data-open`,
	`data-disabled`), поверх — атрибуты потребителя. `ref` — корень.

	В корне стоит один из режимов — по `mode`: поле одной даты или диапазон.
	Поля, календарь и его движок — экземпляры ядра DatePicker (`ctrl`,
	`engine`): размер, вариант, `disabled`, локаль, границы и значение им
	раздаёт ядро, а не разметка, — проброс был бы вторым путём к тем же данным.

	Одна дата — готовый DateInput: коробка, части, кольцо фокуса и ошибка — его.
	Поле и есть группа частей, поэтому имя DatePicker (`aria_label`,
	`aria_labelledBy`, `aria_describedBy`) уходит ему: так оно дойдёт и до
	частей там, где группы скринридер не объявляет. Набор `aria` DatePicker
	ложится на поле атрибутами, поверх его собственного: в нём и то, что
	DatePicker'у даёт поле формы `Field`, — ссылки на подпись и справку и
	ошибка. Кнопки очистки и календаря — в сниппетах поля `clear` и `trailing`,
	в этом порядке: обёртку у конца поля держит тема DateInput. Свою очистку
	поле не рисует: `clearable` ему не уходит.

	Диапазон — поле начала, тире под `aria-hidden`, поле конца и кнопки — одна
	коробка на корне. Поля называют свои концы сами — именами `names_start` и
	`names_end`, выходами плагина имён. Кнопки — после поля конца, а не в его
	сниппете: они работают со всем периодом.

	Кнопка очистки — DatePicker'а, одна на значение: по `clearable`, выключена
	вместе с DatePicker, `readonly` её не гасит. Имя ядро собирает с именем
	DatePicker (`clearAria`), очищает его команда `clear` — у диапазона оба
	конца. Своя кнопка — сниппет `clear` DatePicker'а с его командой в scope:
	заменяет встроенную целиком. Полю очистка уходит сниппетом без своего
	scope: поле позвало бы его со своей командой `clear`, а очищает
	DatePicker. Отдаётся она полю, только когда есть что рисовать.

	Кнопка календаря — связка с панелью и имя (`triggerAria`), вид «нажат»
	(`triggerDataset`), выключена, когда открыть панель нельзя. Нажатие ловит
	плагин открытия на корне. Значок — сниппет `trigger-icon`, иначе иконка
	роли `calendar` без своего размера: по кеглю кнопки.

	Панель — Frame, телепорт в `body`: открытость — `visible` панели, как у
	Select, закрытая панель прячется, а не размонтируется, и календарь в ней
	смонтирован всегда. Якорь — корень (`anchor_anchor` — корень из
	`rootElement` связки), пометка владельцем (`dismiss_ownerAttribute`) —
	нажатие в календарь иначе считалось бы нажатием мимо. На панели —
	`panelAria` (`role="dialog"`, `aria-modal`, имя, `id`) и `panelDataset`
	(`data-swiping`); `tabindex="-1"` — фокус встаёт на саму панель, когда
	внутри нечего фокусировать. Полоса жеста — первой в панели, пока жест
	включён. Содержимое — обёртка календаря, и прокручивается она, а не панель.

	Календарь — готовый Calendar над экземпляром и движком ядра. Содержимое дня
	— сниппет `item` DatePicker, отданный календарю под тем же именем: scope у
	них один. Подвал — только при `confirmable` (сниппет `footer` календаря:
	сниппет непрозрачен, и без условия строка подвала стояла бы пустой):
	«Отмена» закрывает панель, а черновик сбрасывает само закрытие, «OK»
	принимает выбор и выключена посреди диапазона (`confirmDisabled`). Текст —
	выходы плагина имён (`names_cancel`, `names_confirm`).

	Своему содержимому DatePicker опускает пустую связку поля формы: поля —
	детали его разметки — связку поля над ним не берут. Панель
	телепортирована, но `Teleport` монтирует её со всеми контекстами места.
	Панели на сервере нет: сервер рисует DatePicker полем с кнопкой, а панель с
	календарём появляется в браузере.

	Узлы стоят вплотную: пробел между блоками Svelte оставил бы текстом в
	коробке диапазона, в панели и в подвале.
-->
{#snippet clearButton()}
	{#if props.clear}
		{@render props.clear({ clear: ctrl.clear })}
	{:else if state.clearable}
		<Button
			embedded="date-picker.clear"
			type="button"
			class="so-date-picker__clear"
			size={state.size}
			disabled={state.disabled}
			{...state.clearAria}
			onActionClick={clear}
		>
			<Icon embedded="date-picker.clear-icon" tag={CLOSE} size={state.size} />
		</Button>
	{/if}
{/snippet}
{#snippet trigger()}
	<Button
		embedded="date-picker.trigger"
		type="button"
		class="so-date-picker__trigger"
		size={state.size}
		disabled={!state.openable}
		{...state.triggerAria}
		{...state.triggerDataset}
	>
		{#if props['trigger-icon']}
			{@render props['trigger-icon']()}
		{:else}
			<Icon embedded="date-picker.trigger-icon" tag={CALENDAR} />
		{/if}
	</Button>
{/snippet}
{#snippet footer()}
	<Button
		embedded="date-picker.cancel"
		type="button"
		class="so-date-picker__cancel"
		size={state.size}
		text={state.names_cancel}
		onclick={cancel}
	/><Button
		embedded="date-picker.confirm"
		type="button"
		class="so-date-picker__confirm"
		size={state.size}
		disabled={state.confirmDisabled}
		text={state.names_confirm}
		onclick={confirm}
	/>
{/snippet}
{#if state.rendered}
	<Dynamic
		tag="div"
		attributes={{
			id: state.id,
			...toRootProps(
				state,
				[state.attrs, state.rootAria, state.dataset],
				binding.forwardProps,
			),
		}}
		attach={binding.attachElement}
	>
		{#if state.mode === 'single'}<DateInput
				embedded="date-picker.field"
				class="so-date-picker__field"
				ctrl={binding.field}
				aria_label={props.aria_label}
				aria_labelledBy={props.aria_labelledBy}
				aria_describedBy={props.aria_describedBy}
				{...state.aria}
				clear={props.clear || state.clearable ? clearButton : undefined}
				trailing={trigger}
			/>{:else}<DateInput
				embedded="date-picker.start"
				class="so-date-picker__start"
				ctrl={binding.start}
				aria_label={state.names_start}
			/><span class="so-date-picker__dash" aria-hidden="true">–</span><DateInput
				embedded="date-picker.end"
				class="so-date-picker__end"
				ctrl={binding.end}
				aria_label={state.names_end}
			/>{@render clearButton()}{@render trigger()}{/if}<Frame
			embedded="date-picker.frame"
			class="so-date-picker__panel"
			tabindex={-1}
			visible={state.open}
			position="fixed"
			anchor_anchor={binding.rootElement}
			anchor_offset={4}
			{...state.panelAria}
			{...state.panelDataset}
			{...state.dismiss_ownerAttribute}
		>
			{#if state.handleRendered}<div
					class="so-date-picker__handle"
					aria-hidden="true"
				></div>{/if}<div class="so-date-picker__content">
				<Calendar
					embedded="date-picker.calendar"
					class="so-date-picker__calendar"
					ctrl={binding.calendar}
					engine={binding.engine}
					item={props.item}
					footer={state.confirmable ? footer : undefined}
				/>
			</div>
		</Frame>
	</Dynamic>
{/if}
