import type { ElementType, ReactElement } from 'react'
import {
	NativeInput,
	elevated,
	hasSlot,
	renderSlot,
	roleIcon,
	toAriaProps,
	toControlAttrs,
	toRootForward,
	toRootProps,
} from '../../adapter'
import { Button } from '../button'
import { Icon } from '../icon'
import { useSetupNumberInput } from './setup.component'
import type { NumberInputAttributes, NumberInputProps } from './base.component'

/** Значки без слота — иконки по ролям, компонент на роль один на модуль (`roleIcon`). */
const CloseMark = roleIcon('close')
const MinusMark = roleIcon('minus')
const PlusMark = roleIcon('plus')

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
 * строка формата. В узел его пишет поле адаптера (`NativeInput`), только когда
 * текст разошёлся с узлом; правку, которую ядро не взяло, плагин набора
 * возвращает сам. Наборы ядра — в порядке Vue: `inputAttrs` (`dir` и `lang`
 * числа, экранная клавиатура `inputmode`), `aria` (имя, справка, ошибка),
 * `inputAria` (роль `spinbutton` и `aria-value*`). Ни проверки орфографии, ни
 * автозаполнения: число — не слово. `name` у ввода нет — в форму уходит
 * число, а не текст.
 *
 * Обёртка у конца числа и кнопка очистки — как у Input: кнопка первой, перед
 * `trailing`, по `clearable`, выключена вместе с полем, `readonly` её не гасит.
 * Имя ядро собирает с именем поля (`clearAria`), очищает команда поля `clear`
 * — и значение, и набранный текст. Очищает кнопка по `onActionClick` —
 * нативному клику её `TActionPlugin` — и гасит всплытие у нативного события,
 * как `@click.stop` у Vue. Своя кнопка — слот `clear` с командой в scope.
 *
 * Кнопки шага — Button-детали внутри `so-number-input__stepper`: «меньше»,
 * затем «больше», по классам `so-number-input__decrement` и `__increment` их
 * находит плагин кнопок. Обработчиков у них нет: нажатие, удержание и клик
 * скринридера ловит плагин на корне. Выключенность — у края, у выключенного
 * поля и только для чтения (`decrementDisabled`, `incrementDisabled`), наборы
 * — имя от локали и `tabindex="-1"` (`decrementAria`) и `data-pressed`
 * удержания (`decrementDataset`), поверх того, что кнопка пишет себе сама.
 * Значок — слот `decrement-icon` или `increment-icon`, иначе иконка роли
 * `minus` или `plus` размером поля: меняется значок, а кнопка с удержанием
 * остаётся своей.
 *
 * Значение для формы — скрытое поле последним: `name`, `value` — число
 * строкой («1234.5», а не «1 234,5 ₽»), без числа — пустая строка, а не
 * `undefined`: смена `undefined` числом сделала бы неуправляемое поле
 * управляемым. Выключенное поле в форму не уходит.
 *
 * Поле формы `Field` над полем отдаёт ему ошибку, `id` и ссылки на части
 * (`TFieldControlExtension`), а своему содержимому поле опускает пустую
 * связку: контролы в его слотах — его содержимое. Поэтому содержимое слотов,
 * значки кнопок шага тоже, — в слое лифта поля (`elevated`).
 */
export function NumberInput(props: NumberInputProps): ReactElement | null {
	const { ctrl, ref, forwardProps, state, layer } = useSetupNumberInput(props)

	const {
		rendered,
		tag,
		attrs,
		aria,
		dataset,
		id,
		value,
		text,
		name,
		disabled,
		readonly,
		required,
		placeholder,
		size,
		clearable,
		clearAria,
		inputAttrs,
		inputAria,
		decrementDisabled,
		incrementDisabled,
		decrementAria,
		incrementAria,
		decrementDataset,
		incrementDataset,
	} = state

	if (!rendered) return null

	const Tag = tag as ElementType
	const trailing = clearable === true || hasSlot(props.clear) || hasSlot(props.trailing)

	// Корню — его наборы, класс и стиль потребителя; `ref` адаптера последним
	return (
		<Tag {...toRootProps(ref, state, [attrs, dataset], toRootForward(forwardProps))}>
			{hasSlot(props.leading) ? (
				<div className="so-number-input__leading">
					{elevated(layer, renderSlot(props.leading, { ctrl }))}
				</div>
			) : null}
			<NativeInput
				type="text"
				className="so-number-input__input"
				id={id}
				placeholder={placeholder}
				disabled={disabled}
				readOnly={readonly}
				required={required}
				autoComplete="off"
				spellCheck={false}
				{...toAriaProps(inputAttrs)}
				{...toAriaProps(aria)}
				{...toAriaProps(inputAria)}
				{...toControlAttrs<NumberInputAttributes>(forwardProps)}
				live={{ value: text }}
			/>
			{trailing ? (
				<div className="so-number-input__trailing">
					{elevated(layer, renderSlot(props.clear, { clear: ctrl.clear })) ??
						(clearable === true ? (
							<Button
								embedded="number-input.clear"
								type="button"
								className="so-number-input__clear"
								size={size}
								disabled={disabled}
								{...toAriaProps(clearAria)}
								onActionClick={(event) => {
									event.stopPropagation()
									ctrl.clear()
								}}
							>
								<Icon
									embedded="number-input.clear-icon"
									tag={CloseMark}
									size={size}
								/>
							</Button>
						) : null)}
					{elevated(layer, renderSlot(props.trailing, { ctrl }))}
				</div>
			) : null}
			<div className="so-number-input__stepper">
				<Button
					embedded="number-input.decrement"
					type="button"
					className="so-number-input__decrement"
					size={size}
					disabled={decrementDisabled}
					{...toAriaProps(decrementAria)}
					{...toAriaProps(decrementDataset)}
				>
					{elevated(layer, renderSlot(props['decrement-icon'])) ?? (
						<Icon embedded="number-input.decrement-icon" tag={MinusMark} size={size} />
					)}
				</Button>
				<Button
					embedded="number-input.increment"
					type="button"
					className="so-number-input__increment"
					size={size}
					disabled={incrementDisabled}
					{...toAriaProps(incrementAria)}
					{...toAriaProps(incrementDataset)}
				>
					{elevated(layer, renderSlot(props['increment-icon'])) ?? (
						<Icon embedded="number-input.increment-icon" tag={PlusMark} size={size} />
					)}
				</Button>
			</div>
			<input
				type="hidden"
				name={name}
				value={value === undefined ? '' : String(value)}
				disabled={disabled}
			/>
		</Tag>
	)
}
