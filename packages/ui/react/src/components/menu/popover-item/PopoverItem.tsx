import type { ElementType, ReactElement } from 'react'
import {
	renderSlot,
	roleIcon,
	toAriaProps,
	toControlAttrs,
	toRootForward,
	toRootProps,
} from '../../../adapter'
import { Button } from '../../button'
import { Frame } from '../../frame'
import { Icon } from '../../icon'
import { useSetupMenuPopoverItem } from './setup.component'
import type { MenuPopoverItemAttributes, MenuPopoverItemProps } from './base.component'

/** Стрелка без слота — иконка из пакета по роли, компонент на роль один на модуль. */
const ArrowIcon = roleIcon('arrowRight')

/**
 * MenuPopoverItem — пункт с панелью: строка пункта в меню и своя панель сбоку
 * с любым содержимым — календарём, полями, палитрой, как `Menu.PopoverItem`
 * у Vue.
 *
 * Корень — блок пункта, общий с действием и флажком: на нём модификаторы
 * размера меню и своего варианта и состояние для темы — `data-highlighted`,
 * `data-disabled` и `data-open` (панель открыта). Строка красится от него,
 * носитель `dataset` один. Панель телепортирована, поэтому прямоугольник
 * корня — прямоугольник строки, и корень служит панели якорем — значением
 * рендера (`rootElement` от `useRootElement`). Атрибуты потребителя делятся,
 * как у пункта: класс и стиль — корню, остальное — строке.
 *
 * Строка — `Button` на `div` (`menu.row`): на ней ARIA пункта — роль
 * `menuitem`, `aria-haspopup="dialog"`, `aria-expanded`, `id` и
 * `aria-controls` на панель, `tabindex="-1"` от меню — и DOM-фокус, когда
 * пункт подсвечен. Нажатие строки открывает панель, а не выполняет действие:
 * меню остаётся открытым, а открытую панель повторное нажатие не закрывает.
 * Решает меню (`adapters.menu.open()`): выключенному отказывает. Enter и
 * пробел на строке превращает в клик сама строка (`TActionPlugin`), стрелку к
 * концу строки клавиатура пункта гасит и открывает панель сама.
 *
 * Текст строки — слот `header`, а не `default`: `default` — содержимое панели,
 * как у `Accordion.Item` и `Popover`. Scope — `text` и `open`, без слота —
 * текст пункта. Стрелка — у конца строки, в обёртке: тема зеркалит её в RTL
 * по `.so-menu-item__arrow`, и иконка, подменённая слотом `arrow-icon`,
 * зеркалится так же; обёртка скрыта от скринридера — о панели говорит ARIA
 * строки. Подсказки сочетания у этого пункта нет.
 *
 * Панель — Frame: телепорт в `body`, соседка панели меню, а не её потомок,
 * слой поверх неё (нажатие и фокус в ней меню мимо не считает), привязка к
 * корню пункта и пометка владельцем. Встаёт у самого конца строки, верхом
 * вровень с ней, без зазора (`end-start`). На неё ложится её набор ARIA
 * (`panelAria`): `role="dialog"`, `id` и `aria-labelledby` на строку — имя
 * панели. Модификаторов размера и варианта у неё нет: содержимое красится
 * само. Открытость — `visible` панели, а не `rendered`; `lazyMount` действует
 * только на содержимое — обёртка остаётся, панель не размонтируется никогда.
 */
export function MenuPopoverItem(props: MenuPopoverItemProps): ReactElement | null {
	const { ref, forwardProps, state, context, rootElement } = useSetupMenuPopoverItem(props)

	const {
		rendered,
		tag,
		text,
		size,
		disabled,
		open,
		aria,
		dataset,
		attrs,
		panelAria,
		contentRendered,
		dismiss_ownerAttribute,
	} = state

	if (!rendered) return null

	const Tag = tag as ElementType
	const { onClick, ...row } = toControlAttrs<MenuPopoverItemAttributes>(forwardProps)

	// Корню — его наборы, класс и стиль потребителя; `ref` адаптера последним
	return (
		<Tag {...toRootProps(ref, state, [dataset, attrs], toRootForward(forwardProps))}>
			<Button
				embedded="menu.row"
				tag="div"
				size={size}
				disabled={disabled}
				{...toAriaProps(aria)}
				{...row}
				onClick={(event) => {
					context?.adapters.menu.open()
					onClick?.(event)
				}}
				leading={<span className="so-menu-item__icon">{renderSlot(props.leading)}</span>}
				trailing={
					<span className="so-menu-item__arrow" aria-hidden="true">
						{renderSlot(props['arrow-icon']) ?? (
							<Icon embedded="menu.arrow" tag={ArrowIcon} size={size} />
						)}
					</span>
				}
			>
				{renderSlot(props.header, { text: text ?? '', open: open ?? false }) ?? text}
			</Button>
			<Frame
				embedded="menu.popover-item-frame"
				className="so-menu-item__panel"
				tabIndex={-1}
				visible={open}
				position="fixed"
				anchor_anchor={rootElement}
				anchor_placement="end-start"
				{...toAriaProps(panelAria)}
				{...toAriaProps(dismiss_ownerAttribute)}
			>
				<div className="so-menu-item__content">
					{contentRendered ? renderSlot(props.children) : null}
				</div>
			</Frame>
		</Tag>
	)
}
