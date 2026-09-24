import type { ElementType, ReactElement } from 'react'
import { renderSlot, toAriaProps, toRootLayout } from '../../adapter'
import { useSetupLabel } from './setup.component'
import type { LabelProps } from './base.component'

/**
 * Label — подпись контрола. Корень рисуется по `tag`, по умолчанию `label`;
 * модификаторы стороны, размера и варианта — на корне, тема читает всё отсюда.
 *
 * Связки через `for` и `id` нет: контрол — первый labelable-потомок `label`,
 * поэтому клик по тексту переключает его, а текст становится его доступным
 * именем. Внутри — только `span`: `div` и вложенный `label` HTML здесь
 * запрещает, а описание или ошибка вошли бы в имя.
 *
 * Порядок в DOM один на все стороны: контрол, потом текст. Сторону рисует тема.
 *
 * - контрол — `children` (слот `default`): CheckBox, Switch или
 *   RadioGroup.Item с `tag="span"` — корень радио сам `label`, а `label` в
 *   `label` запрещён, забытый тег ловит плагин подписи. Обёртка выравнивает
 *   контрол по первой строке текста;
 * - текст — слот `content`, без него — проп `text`. Вокруг них нет пробелов:
 *   пустую обёртку тема прячет по `:empty`.
 */
export function Label(props: LabelProps): ReactElement | null {
	const { ref, forwardProps, state } = useSetupLabel(props)

	const { rendered, tag, text, aria, dataset, attrs } = state

	if (!rendered) return null

	const Tag = tag as ElementType

	// forwardProps идёт ПЕРВЫМ, чтобы не перекрыть ref адаптера (см. Button)
	return (
		<Tag
			{...forwardProps}
			ref={ref}
			{...toRootLayout(state, forwardProps)}
			{...toAriaProps(attrs)}
			{...toAriaProps(aria)}
			{...toAriaProps(dataset)}
		>
			<span className="s-label__control">{renderSlot(props.children)}</span>
			<span className="s-label__text">{renderSlot(props.content) ?? text}</span>
		</Tag>
	)
}
