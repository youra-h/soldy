import type { ElementType, ReactElement } from 'react'
import { renderSlot, toAriaProps, toRootProps } from '../../adapter'
import { Frame } from '../frame'
import { useSetupTooltip } from './setup.component'
import type { TooltipProps } from './base.component'

/**
 * Tooltip — подсказка у триггера.
 *
 * Корень — обёртка триггера, якорь панели и цель наведения. Панель
 * телепортирована, поэтому в корне лежит только триггер, и прямоугольник
 * корня совпадает с его прямоугольником: курсор на триггере — курсор на
 * корне. Рисуется по `tag`, по умолчанию `span`: подсказка встаёт и в строку
 * текста, и в ряд кнопок. ARIA на корне нет: она у панели и у триггера.
 *
 * Триггер — элемент потребителя в слоте `trigger`. Фокус остаётся на нём и в
 * панель не уходит. Своего экземпляра у содержимого слота нет, поэтому ссылку
 * на панель — `aria-describedby` или, при `type="label"`, `aria-labelledby` —
 * он получает через scope.
 *
 * Панель — Frame: телепорт, слой, привязка к корню — по умолчанию над
 * триггером по центру, в 6 px от него — и пометка владельцем, по которой
 * панель находят плагины. Якорь — корень значением рендера (`rootElement` от
 * `useRootElement`), как у Popover. На панель ложится `aria` подсказки:
 * `role="tooltip"` и `id`, на который ссылается триггер. Панель не
 * фокусируется, кнопки закрытия в ней нет. Открытость — `visible` панели:
 * закрытая спрятана, а не размонтирована, и ссылка триггера ведёт на неё
 * всегда. Обёртка текста держит ширину панели: по тексту, до потолка темы,
 * где бы у края окна панель ни стояла.
 */
export function Tooltip(props: TooltipProps): ReactElement | null {
	const { ref, forwardProps, state, rootElement } = useSetupTooltip(props)

	const {
		rendered,
		tag,
		attrs,
		aria,
		dataset,
		open,
		placement,
		triggerAria,
		dismiss_ownerAttribute,
	} = state

	if (!rendered) return null

	const Tag = tag as ElementType

	// Корню — его наборы, поверх — атрибуты снаружи, `ref` адаптера последним
	return (
		<Tag {...toRootProps(ref, state, [attrs, dataset], forwardProps)}>
			{renderSlot(props.trigger, { triggerAria: triggerAria ?? {} })}
			<Frame
				embedded="tooltip.frame"
				className="so-tooltip__panel"
				visible={open}
				position="fixed"
				anchor_anchor={rootElement}
				anchor_placement={placement}
				anchor_offset={6}
				{...toAriaProps(aria)}
				{...toAriaProps(dismiss_ownerAttribute)}
			>
				<div className="so-tooltip__content">{renderSlot(props.children)}</div>
			</Frame>
		</Tag>
	)
}
