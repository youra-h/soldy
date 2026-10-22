import type { ElementType, ReactElement } from 'react'
import type { TDateInputSegment } from '@soldy-ui/core'
import { elevated, hasSlot, renderSlot, roleIcon, toAriaProps, toRootProps } from '../../adapter'
import { Button } from '../button'
import { Icon } from '../icon'
import { useSetupDateInput } from './setup.component'
import type { DateInputProps } from './base.component'

/** Глиф кнопки очистки — компонент на роль, один на модуль (`roleIcon`). */
const CloseMark = roleIcon('close')

/**
 * Часть или разделитель ряда. Ключ части — её тип, разделителя — место в
 * формате: при наборе и при смене локали часть меняет текст и место, а её
 * узел остаётся тем же — с фокусом на нём.
 *
 * Текст — единственный ребёнок `span`, строка. Такой текст React пишет
 * свойством узла (`textContent`) и своих узлов-детей не держит: на касание
 * часть редактируемая, и браузер (композиция, клавиатура, которая правит и
 * после погашенного Backspace) оставляет её пустой или из нескольких узлов —
 * следующая запись текста ядра заменит содержимое целиком, а не уйдёт в
 * текстовый узел, которого уже нет. Обёртка вокруг текста или второй ребёнок
 * рядом дали бы части узлы-детей React, и правка браузера их отвязала бы. Текст
 * ядра после правки браузера возвращает сенсорный плагин.
 *
 * У редактируемой части с детьми React предупреждает о `contentEditable` в
 * консоль. Детьми части здесь ведает ядро — через текст, который React пишет
 * целиком, — поэтому предупреждение снято (`suppressContentEditableWarning`).
 */
function drawSegment(segment: TDateInputSegment): ReactElement {
	if (segment.type === 'literal') {
		return (
			<span
				key={segment.key}
				className="so-date-input__literal"
				{...toAriaProps(segment.aria)}
			>
				{segment.text}
			</span>
		)
	}

	return (
		<span
			key={segment.key}
			className="so-date-input__segment"
			suppressContentEditableWarning
			{...toAriaProps(segment.attrs)}
			{...toAriaProps(segment.aria)}
			{...toAriaProps(segment.dataset)}
		>
			{segment.text}
		</span>
	)
}

/**
 * DateInput — поле даты из частей по формату локали: день, месяц и год, а у
 * поля даты и времени — ещё час, минута, с точностью до секунды секунда и, у
 * 12-часового цикла, период суток, в порядке и с разделителями
 * `Intl.DateTimeFormat#formatToParts`. Корень — коробка поля семьи Input:
 * рисуется по `tag` (по умолчанию `div`), на нём `id` поля и наборы `attrs`
 * (`dir` поля), `aria` (`role="group"`, имя — `aria_label` или
 * `aria_labelledBy`) и `dataset` (`data-disabled`, `data-invalid`), поверх —
 * атрибуты потребителя целиком, как у Vue: поля ввода, между которым их
 * делить, у даты нет. `ref` адаптера последним (`toRootProps`).
 *
 * Порядок узлов — как у Vue: слот `leading`, ряд частей, обёртка у конца поля,
 * скрытое поле формы.
 *
 * Ряд частей — флекс, а не строка текста: каждая часть и каждый разделитель —
 * своя коробка, иначе Chrome переносит начало протяжки мышью от левого края
 * части в соседний текст. Направление и язык ряда — набор `segmentsAttrs`.
 * Части и разделители — выход ядра `segments` в порядке формата (`drawSegment`).
 *
 * Часть — `span` с наборами `attrs` (на сенсорном устройстве —
 * `contenteditable`, `inputmode`, без проверки орфографии и автозамены; имена
 * пропов React им даёт `toAriaProps`), `aria` (`role="spinbutton"`, имя,
 * `aria-value*`, остановка Tab, `id`) и `dataset` (`data-type`,
 * `data-placeholder`). Разделитель — литерал формата под `aria-hidden` (его
 * `aria`). Сервер и компьютер рисуют часть нередактируемой.
 *
 * Обёртка у конца поля — по кнопке очистки, своей кнопке в слоте `clear` или
 * слоту `trailing`. Кнопка очистки — та же, что у Input: первой, перед
 * `trailing`, по `clearable`, выключена вместе с полем, `readonly` её не гасит.
 * Имя ядро собирает с именем поля (`clearAria`), очищает команда поля `clear`
 * — все части, и скрытые форматом тоже. Очищает кнопка по `onActionClick` —
 * нативному клику её `TActionPlugin` — и гасит всплытие у нативного события,
 * как `@click.stop` у Vue: синтетический `stopPropagation` React опоздал бы.
 * Своя кнопка — слот `clear` с командой в scope: заменяет встроенную целиком.
 *
 * Обработчиков в разметке больше нет: клавиши, буфер обмена, выделение,
 * контекстное меню и касание ловят плагины на корне.
 *
 * Значение для формы — скрытое поле последним: `name`, `value` — дата строкой,
 * пока значение не собрано — пустая строка. Выключенное поле в форму не уходит.
 *
 * Поле формы `Field` над полем отдаёт ему ошибку и ссылки на части
 * (`TFieldControlExtension`), а своему содержимому поле опускает пустую
 * связку: контролы в его слотах — его содержимое. Поэтому содержимое слотов —
 * в слое лифта поля (`elevated`).
 */
export function DateInput(props: DateInputProps): ReactElement | null {
	const { ctrl, ref, forwardProps, state, layer } = useSetupDateInput(props)

	const {
		rendered,
		tag,
		id,
		attrs,
		aria,
		dataset,
		segments,
		segmentsAttrs,
		name,
		value,
		disabled,
		size,
		clearable,
		clearAria,
	} = state

	if (!rendered) return null

	const Tag = tag as ElementType
	const trailing = clearable === true || hasSlot(props.clear) || hasSlot(props.trailing)

	// Наборы ядра, поверх — атрибуты снаружи, `ref` адаптера последним
	return (
		<Tag id={id} {...toRootProps(ref, state, [attrs, aria, dataset], forwardProps)}>
			{hasSlot(props.leading) ? (
				<div className="so-date-input__leading">
					{elevated(layer, renderSlot(props.leading, { ctrl }))}
				</div>
			) : null}
			<span className="so-date-input__segments" {...toAriaProps(segmentsAttrs)}>
				{segments?.map(drawSegment)}
			</span>
			{trailing ? (
				<div className="so-date-input__trailing">
					{elevated(layer, renderSlot(props.clear, { clear: ctrl.clear })) ??
						(clearable === true ? (
							<Button
								embedded="date-input.clear"
								type="button"
								className="so-date-input__clear"
								size={size}
								disabled={disabled}
								{...toAriaProps(clearAria)}
								onActionClick={(event) => {
									event.stopPropagation()
									ctrl.clear()
								}}
							>
								<Icon
									embedded="date-input.clear-icon"
									tag={CloseMark}
									size={size}
								/>
							</Button>
						) : null)}
					{elevated(layer, renderSlot(props.trailing, { ctrl }))}
				</div>
			) : null}
			<input type="hidden" name={name} value={value ?? ''} disabled={disabled} />
		</Tag>
	)
}
