import type { ElementType, ReactElement } from 'react'
import {
	NativeInput,
	hasSlot,
	renderSlot,
	roleIcon,
	toAriaProps,
	toControlAttrs,
	toRootLayout,
} from '../../adapter'
import { Button } from '../button'
import { Icon } from '../icon'
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
 * Обёртка слота рисуется, только если в неё есть что положить; содержимое
 * получает сам инстанс поля — кнопке рядом с полем нужны его значение и
 * методы.
 *
 * Кнопка очистки — первой в обёртке у конца поля, перед `trailing`, как у
 * Vue: по `clearable`, выключена вместе с полем, `readonly` её не гасит. Имя
 * ядро собирает с именем поля (`clearAria`), очищает команда поля `clear`.
 * Своя кнопка — слот `clear` с командой в scope: заменяет встроенную целиком.
 *
 * Очищает кнопка по `onActionClick` — нативному клику её `TActionPlugin` — и
 * гасит всплытие у нативного события, как крестик таба: синтетический
 * `stopPropagation` React опоздал бы — к нему событие уже прошло корни
 * предков, а select-only Select открывает панель кликом по корню. Vue гасит
 * то же `@click.stop`.
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
		size,
		clearable,
		clearAria,
	} = state

	if (!rendered) return null

	const Tag = tag as ElementType
	const trailing = clearable === true || hasSlot(props.clear) || hasSlot(props.trailing)

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
			{trailing ? (
				<div className="s-input__trailing">
					{renderSlot(props.clear, { clear: ctrl.clear }) ??
						(clearable === true ? (
							<Button
								embedded="input.clear"
								className="s-input__clear"
								size={size}
								disabled={disabled}
								{...toAriaProps(clearAria)}
								onActionClick={(event) => {
									event.stopPropagation()
									ctrl.clear()
								}}
							>
								<Icon
									embedded="input.clear-icon"
									tag={roleIcon('close')}
									size={size}
								/>
							</Button>
						) : null)}
					{renderSlot(props.trailing, { ctrl })}
				</div>
			) : null}
		</Tag>
	)
}
