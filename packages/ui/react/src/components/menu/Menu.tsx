import type { ElementType, ReactElement } from 'react'
import { Elevate, hasSlot, renderSlot, toAriaProps, toPartClass, toRootProps } from '../../adapter'
import { Frame } from '../frame'
import { drawItems } from './submenu/Submenu'
import { useSetupMenu } from './setup.component'
import type { MenuProps } from './base.component'

/**
 * Menu — меню действий у кнопки (APG Menu Button) или контекстное меню
 * области, как у Vue.
 *
 * Корень — обёртка триггера и якорь панели, как у Popover. Рисуется по `tag`,
 * по умолчанию `span`: меню встаёт и в строку текста, и в ряд кнопок. Панель
 * телепортирована, поэтому в корне лежит только триггер, и прямоугольник
 * корня — прямоугольник триггера. На корне — `attrs` и `dataset` (`data-open`
 * — для потребителя, который красит свой триггер по контексту), поверх —
 * атрибуты потребителя, `ref` адаптера последним. ARIA на корне нет: она у
 * панели и у триггера.
 *
 * Триггер — кнопка потребителя («…», «Действия») в слоте `trigger`. Лежит
 * внутри корня: нажатие по открытому триггеру — нажатие внутри владельца, и
 * панель не мигает. Своего экземпляра у содержимого слота нет, поэтому
 * сторону связки (`aria-haspopup`, `aria-expanded`, `id`, `aria-controls`) и
 * вид «нажата» (`data-selected`) он получает через scope — двумя наборами,
 * ARIA и `data-*` врозь. Связка меняется на каждое открытие, а триггер
 * остаётся тем же узлом: React сверяет новую разметку слота с прежней. У
 * контекстного меню (`openOn: 'contextmenu'`) в слоте — область: строка,
 * файл, картинка, — и связка у неё пуста.
 *
 * Панель — Frame: телепорт, слой, привязка к корню (`TAnchorPlugin`, отступ
 * 4px, как у Select) и пометка владельцем для закрытия по нажатию мимо. На неё
 * ложится `aria` меню: `role="menu"`, `id`, на который ссылается
 * `aria-controls` триггера, и `aria-labelledby` на триггер — имя меню.
 * `tabIndex={-1}` — фокус встаёт на саму панель, пока ни один пункт не
 * подсвечен. Якорь — корень значением рендера (`rootElement` от
 * `useRootElement`): `null` на сервере и до коммита, узел после; у
 * контекстного меню панель встаёт у точки вызова (`point`): точка главнее
 * корня, пока задана, и выбирает между ними якорь, а не разметка. Открытость
 * — `visible` панели, а не `rendered`: пункты входят в коллекцию при
 * монтировании, и закрытие не должно её вычищать. Классы панели — свой набор
 * меню (`panelClasses`): блок `so-menu__panel` с размером и вариантом меню —
 * модификаторы корня до телепортированной панели не доходят; строкой его
 * раскладывает адаптер (`toPartClass`).
 *
 * Список (`so-menu__list`) — то, что прокручивается. Роль `menu` — у панели, а
 * не у него: фокус без подсветки держит панель, и узел с ролью и фокусом
 * должен быть один. Пункты — дети (`<Menu.Item>` и соседи), а без них — пункты
 * из данных (`items`) по секциям показанных (`drawItems`, одна разметка с
 * подменю).
 *
 * Всё содержимое корня — в слое лифта меню (`Elevate`), как у ListBox: пункт,
 * смонтированный в панели, прочтёт движок и регистратор меню и при коммите
 * войдёт в его коллекцию. Портал React контекст сохраняет, поэтому пункты в
 * телепортированной панели слой меню видят. На сервере портала нет — панели и
 * пунктов в серверной разметке нет, как у Popover.
 *
 * Логики здесь нет — см. `useSetupMenu`.
 */
export function Menu(props: MenuProps): ReactElement | null {
	const { ref, forwardProps, state, rootElement, layer } = useSetupMenu(props)

	const {
		rendered,
		tag,
		attrs,
		aria,
		dataset,
		open,
		point,
		placement,
		triggerAria,
		triggerDataset,
		panelClasses,
		dismiss_ownerAttribute,
	} = state

	if (!rendered) return null

	const Tag = tag as ElementType

	// Корню — его наборы, поверх — атрибуты снаружи, `ref` адаптера последним
	return (
		<Tag {...toRootProps(ref, state, [attrs, dataset], forwardProps)}>
			<Elevate layer={layer}>
				{renderSlot(props.trigger, {
					triggerAria: triggerAria ?? {},
					triggerDataset: triggerDataset ?? {},
				})}
				<Frame
					embedded="menu.frame"
					className={toPartClass(panelClasses)}
					tabIndex={-1}
					visible={open}
					position="fixed"
					anchor_anchor={rootElement}
					anchor_point={point}
					anchor_placement={placement}
					anchor_offset={4}
					{...toAriaProps(aria)}
					{...toAriaProps(dismiss_ownerAttribute)}
				>
					<div className="so-menu__list">
						{hasSlot(props.children)
							? renderSlot(props.children)
							: drawItems(state, props)}
					</div>
				</Frame>
			</Elevate>
		</Tag>
	)
}
