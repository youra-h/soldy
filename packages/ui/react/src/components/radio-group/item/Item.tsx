import type { ElementType, ReactElement } from 'react'
import {
	NativeInput,
	renderSlot,
	toAriaProps,
	toControlAttrs,
	toRootForward,
	toRootProps,
} from '../../../adapter'
import { useSetupRadioGroupItem } from './setup.component'
import type { RadioGroupItemAttributes, RadioGroupItemProps } from './base.component'

/**
 * RadioGroupItem — радио: корень по `tag` (по умолчанию `label`) и нативный
 * `<input type="radio">` внутри, рядом — кольцо с точкой и подпись, как у Vue.
 *
 * Корень — `label`: клик по подписи выбирает радио, а подпись становится его
 * доступным именем. На корне — `dataset` (`data-selected`, `data-disabled`),
 * `attrs` (`dir`) и модификаторы размера, варианта и вида в `classes`: тема
 * читает всё отсюда. Атрибуты потребителя делятся, как у поля: класс и стиль
 * — корню, остальное — радио, поверх его `aria`: `id` для `<label for>`
 * снаружи, обработчики.
 *
 * Группировку по общему `name`, стрелки по кругу, пропуск выключенных,
 * пробел, одну остановку Tab на группу и участие в форме даёт браузер. Набор
 * `aria` радио — на поле; `checked` и `disabled` нативные, ARIA-дублей им нет.
 * Отметку проводит поле адаптера (`NativeInput`) — живым состоянием, а не
 * контролируемым полем React; `value` — атрибутом: у радио это значение для
 * формы.
 *
 * Выбор пользователя приходит `onChange` поля: браузер уже отметил радио и
 * снял отметку с соседа, коллекции остаётся сделать его активным — как
 * `@change` у Vue. Потом зовётся `onChange` потребителя.
 *
 * Поле стоит перед кольцом: кольцо фокуса тема рисует соседним селектором от
 * него, а само поле скрывает. Кольцо и точка — декор без текста: отметку
 * скринридеру сообщает `checked`. Подпись — только слот, своего текста у
 * радио нет; её может не быть, и пустую обёртку тема прячет по `:empty`,
 * поэтому вокруг слота нет ни пробела, ни узла.
 */
export function RadioGroupItem(props: RadioGroupItemProps): ReactElement | null {
	const { ref, forwardProps, state, context } = useSetupRadioGroupItem(props)

	const { rendered, tag, name, value, disabled, active, aria, dataset, attrs } = state

	if (!rendered) return null

	const Tag = tag as ElementType
	const { onChange, ...control } = toControlAttrs<RadioGroupItemAttributes>(forwardProps)

	return (
		<Tag {...toRootProps(ref, state, [dataset, attrs], toRootForward(forwardProps))}>
			<NativeInput
				className="s-radio-group-item__input"
				type="radio"
				name={name}
				value={value}
				disabled={disabled}
				{...toAriaProps(aria)}
				{...control}
				onChange={(event) => {
					if (context) context.adapters.activation.active = true
					onChange?.(event)
				}}
				live={{ checked: active }}
			/>
			<span className="s-radio-group-item__control">
				<span className="s-radio-group-item__indicator" />
			</span>
			<span className="s-radio-group-item__text">{renderSlot(props.children)}</span>
		</Tag>
	)
}
