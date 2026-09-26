import type { ElementType, ReactElement } from 'react'
import {
	NativeInput,
	hasSlot,
	renderSlot,
	toAriaProps,
	toControlAttrs,
	toRootLayout,
} from '../../adapter'
import { useSetupInput } from './setup.component'
import type { InputAttributes, InputProps } from './base.component'

/**
 * Input — текстовое поле: корень по `tag` (по умолчанию `div`) и `<input>`
 * внутри, по сторонам — слоты `leading` и `trailing`.
 *
 * Наборы ядра стоят на разных элементах: `attrs` (`dir`) — на корне, `aria` —
 * на `<input>`. Нативные `disabled`, `readonly` и `required` поля проводит
 * разметка, поэтому ARIA-дублей ядро рядом с ними не пишет. Атрибуты
 * потребителя делятся так же, как у Vue: класс и стиль — корню, всё
 * остальное — полю, поверх его атрибутов.
 *
 * Текст поля ведёт ядро: в ядро его несёт плагин ввода, в узел — поле
 * адаптера (`NativeInput`), контролируемого поля React здесь нет.
 *
 * Слоты стоят по сторонам поля, а не внутри него: `<input>` детей не имеет.
 * Обёртка слота рисуется, только если слот передан; содержимое получает сам
 * инстанс поля — кнопке рядом с полем нужны его значение и методы.
 */
export function Input(props: InputProps): ReactElement | null {
	const { ctrl, ref, forwardProps, state } = useSetupInput(props)

	const {
		rendered,
		tag,
		attrs,
		aria,
		id,
		value,
		name,
		disabled,
		readonly,
		required,
		placeholder,
	} = state

	if (!rendered) return null

	const Tag = tag as ElementType

	return (
		<Tag ref={ref} {...toRootLayout(state, forwardProps)} {...toAriaProps(attrs)}>
			{hasSlot(props.leading) ? (
				<div className="s-input__leading">{renderSlot(props.leading, { ctrl })}</div>
			) : null}
			<NativeInput
				type="text"
				id={id}
				name={name}
				disabled={disabled}
				readOnly={readonly}
				required={required}
				placeholder={placeholder}
				{...toAriaProps(aria)}
				{...toControlAttrs<InputAttributes>(forwardProps)}
				live={{ value }}
			/>
			{hasSlot(props.trailing) ? (
				<div className="s-input__trailing">{renderSlot(props.trailing, { ctrl })}</div>
			) : null}
		</Tag>
	)
}
