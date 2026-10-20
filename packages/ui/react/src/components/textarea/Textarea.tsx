import type { ElementType, ReactElement } from 'react'
import {
	NativeTextarea,
	toAriaProps,
	toControlAttrs,
	toRootForward,
	toRootProps,
} from '../../adapter'
import { useSetupTextarea } from './setup.component'
import type { TextareaAttributes, TextareaProps } from './base.component'

/**
 * Textarea — многострочное поле: корень по `tag` (по умолчанию `div`) и
 * `<textarea>` внутри, под ним — счётчик символов.
 *
 * Наборы ядра стоят на разных элементах, как у Input: `attrs` (`dir`) и
 * `dataset` (`data-disabled`, `data-invalid`, `data-limit`) — на корне,
 * `aria` — на `<textarea>`: тема красит рамку и счётчик по корню, а ошибку
 * скринридеру объявляет поле. Нативные `rows`, `maxlength`, `disabled`,
 * `readonly` и `required` поля проводит разметка, поэтому ARIA-дублей ядро
 * рядом с ними не пишет. Атрибуты потребителя делятся, как у Vue: класс и
 * стиль — корню, всё остальное — полю, поверх его `aria`.
 *
 * Текст поля ведёт ядро: в ядро его несёт плагин ввода, в узел — поле
 * адаптера (`NativeTextarea`), контролируемого поля React здесь нет. Высоту
 * по тексту пишет в узел плагин автороста.
 *
 * Счётчик — только при `counter`: текст «12 / 200» пишет плагин имён по
 * локали поддерева (`names_counter`), а набор `counterAria` несёт его `id`.
 * Поле ссылается на него `aria-describedby`, и текст звучит на фокусе поля, а
 * не живым регионом на каждый символ.
 */
export function Textarea(props: TextareaProps): ReactElement | null {
	const { ref, forwardProps, state } = useSetupTextarea(props)

	const {
		rendered,
		tag,
		attrs,
		aria,
		dataset,
		id,
		value,
		name,
		rows,
		maxlength,
		disabled,
		readonly,
		required,
		placeholder,
		counter,
		counterAria,
		names_counter,
	} = state

	if (!rendered) return null

	const Tag = tag as ElementType

	// Корню — его наборы, класс и стиль потребителя; `ref` адаптера последним
	return (
		<Tag {...toRootProps(ref, state, [attrs, dataset], toRootForward(forwardProps))}>
			<NativeTextarea
				id={id}
				name={name}
				rows={rows}
				maxLength={maxlength}
				disabled={disabled}
				readOnly={readonly}
				required={required}
				placeholder={placeholder}
				{...toAriaProps(aria)}
				{...toControlAttrs<TextareaAttributes>(forwardProps)}
				text={value}
			/>
			{counter === true ? (
				<div className="so-textarea__counter" {...toAriaProps(counterAria)}>
					{names_counter}
				</div>
			) : null}
		</Tag>
	)
}
