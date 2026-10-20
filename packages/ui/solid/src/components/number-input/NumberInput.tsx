import { Show, type JSX } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import {
	Elevate,
	createRootProps,
	fieldText,
	resolveSlot,
	roleIcon,
	rootTag,
	toControlAttrs,
	toRootForward,
} from '../../adapter'
import { Button } from '../button'
import { Icon } from '../icon'
import { setupNumberInput } from './setup.component'
import type { NumberInputAttributes, NumberInputProps } from './base.component'

/** Глифы кнопок — компоненты на роль: `tag` у Icon — корень, а не роль. */
const CloseGlyph = roleIcon('close')
const MinusGlyph = roleIcon('minus')
const PlusGlyph = roleIcon('plus')

/**
 * NumberInput — поле числа: ввод и кнопки шага «меньше» и «больше». Корень —
 * коробка поля семьи Input: рисуется по `tag` (по умолчанию `div`), на нём —
 * `attrs` (`dir` поля) и `dataset` (`data-disabled`, `data-invalid`): тема
 * красит коробку и подпись поля формы `Field` по корню, а `aria` — у ввода.
 * Атрибуты потребителя делятся, как у Vue: класс и стиль — корню, всё
 * остальное — вводу, поверх его наборов.
 *
 * Порядок узлов — как у Vue: слот `leading`, ввод, обёртка у конца числа,
 * кнопки шага, значение для формы. Кнопки — последними из видимых, у края
 * поля: их место не зависит от того, чем заняты слоты.
 *
 * Ввод — `<input type="text">` с классом `so-number-input__input`: по нему
 * ввод находят плагины поля, рядом в корне лежит скрытое поле формы. Текст —
 * буфер правки ядра (`text`), а не `value`: пока набирают, набранное, после —
 * строка формата. В узел его пишет `ref` поля (`fieldText`), только когда
 * текст разошёлся с узлом: привязку `value` Solid писал бы узлу его же текст
 * на каждое нажатие. На сервере текст — атрибутом `value`. Наборы ядра — в
 * порядке Vue: `inputAttrs` (`dir` и `lang` числа, экранная клавиатура
 * `inputmode`), `aria` (имя, справка, ошибка), `inputAria` (роль `spinbutton`
 * и `aria-value*`). Ни проверки орфографии, ни автозаполнения: число — не
 * слово. `name` у ввода нет — в форму уходит число, а не текст.
 *
 * Обёртка у конца числа и кнопка очистки — как у Input: кнопка первой, перед
 * `trailing`, по `clearable`, выключена вместе с полем, `readonly` её не гасит.
 * Имя ядро собирает с именем поля (`clearAria`), очищает команда поля `clear`
 * — и значение, и набранный текст. Очищает кнопка по `onActionClick` —
 * нативному клику её `TActionPlugin` — и гасит всплытие у самого события, как
 * `@click.stop` у Vue. Своя кнопка — слот `clear` с командой в scope.
 *
 * Кнопки шага — Button-детали внутри `so-number-input__stepper`: «меньше»,
 * затем «больше», по классам `so-number-input__decrement` и `__increment` их
 * находит плагин кнопок. Обработчиков у них нет: нажатие, удержание и клик
 * скринридера ловит плагин на корне. Выключенность — у края, у выключенного
 * поля и только для чтения, наборы — имя от локали и `tabindex="-1"`
 * (`decrementAria`) и `data-pressed` удержания (`decrementDataset`), поверх
 * того, что кнопка пишет себе сама. Значок — слот `decrement-icon` или
 * `increment-icon`, иначе иконка роли `minus` или `plus` размером поля.
 *
 * Значение для формы — скрытое поле последним: `name`, `value` — число
 * строкой («1234.5», а не «1 234,5 ₽»), без числа — пусто. Выключенное поле в
 * форму не уходит.
 *
 * Поле формы `Field` над полем отдаёт ему ошибку, `id` и ссылки на части
 * (`TFieldControlExtension`), а своему содержимому поле опускает пустую
 * связку. Поэтому содержимое — в слое лифта поля (`Elevate`), и слоты
 * разворачиваются там же (`resolveSlot`): узлы слота Solid создаёт там, где
 * его развернули.
 */
export function NumberInput(props: NumberInputProps): JSX.Element {
	const binding = setupNumberInput(props)
	const state = binding.state
	const ctrl = binding.ctrl
	// Корню — его наборы, класс и стиль потребителя; `ref` адаптера последним
	const root = createRootProps(() => ({
		state,
		sets: [state.attrs, state.dataset],
		forward: toRootForward(binding.forwardProps()),
	}))
	const control = () => toControlAttrs<NumberInputAttributes>(binding.forwardProps())
	const text = fieldText(() => state.text)

	function clear(event: MouseEvent): void {
		event.stopPropagation()
		ctrl.clear()
	}

	/** Содержимое корня — под слоем лифта поля: зовёт его `Elevate`, внутри себя. */
	function content(): JSX.Element {
		const leadingSlot = resolveSlot(
			() => props.leading,
			() => ({ ctrl }),
		)
		const clearSlot = resolveSlot(
			() => props.clear,
			() => ({ clear: ctrl.clear }),
		)
		const trailingSlot = resolveSlot(
			() => props.trailing,
			() => ({ ctrl }),
		)
		const decrementIcon = resolveSlot(
			() => props['decrement-icon'],
			() => ({}),
		)
		const incrementIcon = resolveSlot(
			() => props['increment-icon'],
			() => ({}),
		)

		return (
			<>
				<Show when={leadingSlot()}>
					<div class="so-number-input__leading">{leadingSlot()}</div>
				</Show>
				<input
					type="text"
					class="so-number-input__input"
					id={state.id}
					placeholder={state.placeholder}
					disabled={state.disabled}
					readonly={state.readonly}
					required={state.required}
					autocomplete="off"
					spellcheck="false"
					{...state.inputAttrs}
					{...state.aria}
					{...state.inputAria}
					{...control()}
					{...text}
				/>
				<Show
					when={
						state.clearable === true ||
						clearSlot() !== undefined ||
						trailingSlot() !== undefined
					}
				>
					<div class="so-number-input__trailing">
						<Show
							when={clearSlot()}
							fallback={
								<Show when={state.clearable}>
									<Button
										embedded="number-input.clear"
										type="button"
										class="so-number-input__clear"
										size={state.size}
										disabled={state.disabled}
										{...state.clearAria}
										onActionClick={clear}
									>
										<Icon
											embedded="number-input.clear-icon"
											tag={CloseGlyph}
											size={state.size}
										/>
									</Button>
								</Show>
							}
						>
							{clearSlot()}
						</Show>
						{trailingSlot()}
					</div>
				</Show>
				<div class="so-number-input__stepper">
					<Button
						embedded="number-input.decrement"
						type="button"
						class="so-number-input__decrement"
						size={state.size}
						disabled={state.decrementDisabled}
						{...state.decrementAria}
						{...state.decrementDataset}
					>
						{decrementIcon() ?? (
							<Icon
								embedded="number-input.decrement-icon"
								tag={MinusGlyph}
								size={state.size}
							/>
						)}
					</Button>
					<Button
						embedded="number-input.increment"
						type="button"
						class="so-number-input__increment"
						size={state.size}
						disabled={state.incrementDisabled}
						{...state.incrementAria}
						{...state.incrementDataset}
					>
						{incrementIcon() ?? (
							<Icon
								embedded="number-input.increment-icon"
								tag={PlusGlyph}
								size={state.size}
							/>
						)}
					</Button>
				</div>
				<input
					type="hidden"
					name={state.name}
					value={state.value === undefined ? '' : String(state.value)}
					disabled={state.disabled}
				/>
			</>
		)
	}

	return (
		<Show when={state.rendered}>
			<Dynamic {...root()} component={rootTag(state.tag)} ref={binding.ref}>
				<Elevate layer={binding.layer}>{content()}</Elevate>
			</Dynamic>
		</Show>
	)
}
