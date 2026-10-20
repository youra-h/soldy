import type { ElementType, ReactElement } from 'react'
import { renderSlot, roleIcon, toAriaProps, toRootProps } from '../../adapter'
import { Button } from '../button'
import { Frame } from '../frame'
import { Icon } from '../icon'
import { useSetupPopover } from './setup.component'
import type { PopoverProps } from './base.component'

/** Иконка крестика — компонент на роль, один на модуль (`roleIcon`). */
const CloseIcon = roleIcon('close')

/**
 * Popover — панель с произвольным содержимым у триггера (немодальный диалог).
 *
 * Корень — обёртка триггера и якорь панели. Рисуется по `tag`, по умолчанию
 * `span`: Popover встаёт и в строку текста, и в ряд тегов, а внутри строчного
 * элемента HTML разрешает только строчную разметку. Панель телепортирована,
 * поэтому в корне лежит только триггер, и прямоугольник корня совпадает с его
 * прямоугольником. На корне — `attrs`, `dataset` (`data-open` — для темы и
 * для потребителя, который красит свой триггер по контексту) и атрибуты
 * потребителя, как у Vue; ARIA на корне нет — она у панели и у триггера.
 *
 * Триггер — содержимое потребителя в слоте `trigger`, например кнопка «…» у
 * Tags. Лежит внутри корня, поэтому нажатие по открытому триггеру — нажатие
 * внутри владельца, и панель не мигает. Своего экземпляра у содержимого слота
 * нет, поэтому сторону связки (`aria-haspopup`, `aria-expanded`,
 * `aria-controls`) и вид «нажат» (`data-selected`) он получает через scope —
 * двумя наборами, ARIA и `data-*` врозь.
 *
 * Панель — Frame: телепорт, слой, привязка к корню, пометка владельцем. Якорь
 * — корень значением рендера (`rootElement` от `useRootElement`): `null` на
 * сервере и до коммита, узел после, новый — после смены `tag`. На панель
 * ложится `aria` поповера — `role="dialog"`, `id`, на который ссылается
 * `aria-controls` триггера, имя от `TAriaPlugin`, — `panelDataset`
 * (`data-swiping`, у панели в контейнере — `data-edge`) и пометка владельцем
 * `dismiss_ownerAttribute`. `tabIndex={-1}` — фокус встаёт на саму панель,
 * когда внутри нечего фокусировать. Открытость — `visible` панели, а не
 * `rendered`: закрытие её прячет, а не размонтирует. Открытость для темы
 * (`data-open`) Frame пишет сам — это видимость его слоя, а `data-open` корня
 * до телепортированной панели не доходит. Сторону у края окна выбирает
 * `TAnchorPlugin` поверх `placement`. `contained` оставляет панель в корне,
 * без телепорта: она прижата к краю (`edge`) ближайшего позиционированного
 * предка, и якорь её не двигает.
 *
 * В панели по порядку: полоса жеста — пока жест включён (`handleRendered`),
 * немая для скринридера, ставит её тема; содержимое — в DOM раньше крестика,
 * в том же порядке, в каком читается верхний ряд панели, поэтому фокус при
 * открытии встаёт на первый фокусируемый элемент содержимого, а крестик —
 * последняя остановка Tab; `lazyMount` действует только на слот, обёртка
 * остаётся. Крестик только пишет `open = false`: куда вернуть фокус, решает
 * плагин фокуса. Вида и размера у него нет — тема красит его по контексту
 * (`.so-popover__close`).
 */
export function Popover(props: PopoverProps): ReactElement | null {
	const { ctrl, ref, forwardProps, state, rootElement } = useSetupPopover(props)

	const {
		rendered,
		tag,
		attrs,
		aria,
		dataset,
		open,
		contained,
		placement,
		closable,
		closeAria,
		triggerAria,
		triggerDataset,
		panelDataset,
		contentRendered,
		handleRendered,
		dismiss_ownerAttribute,
	} = state

	if (!rendered) return null

	const Tag = tag as ElementType

	// Корню — его наборы, поверх — атрибуты снаружи, `ref` адаптера последним
	return (
		<Tag {...toRootProps(ref, state, [attrs, dataset], forwardProps)}>
			{renderSlot(props.trigger, {
				triggerAria: triggerAria ?? {},
				triggerDataset: triggerDataset ?? {},
			})}
			<Frame
				embedded="popover.frame"
				className="so-popover__panel"
				tabIndex={-1}
				visible={open}
				contained={contained}
				position="fixed"
				anchor_anchor={rootElement}
				anchor_placement={placement}
				anchor_offset={8}
				{...toAriaProps(aria)}
				{...toAriaProps(panelDataset)}
				{...toAriaProps(dismiss_ownerAttribute)}
			>
				{handleRendered ? <div className="so-popover__handle" aria-hidden="true" /> : null}
				<div className="so-popover__content">
					{contentRendered ? renderSlot(props.children) : null}
				</div>
				<Button
					embedded="popover.close"
					type="button"
					className="so-popover__close"
					rendered={closable}
					onClick={() => {
						ctrl.open = false
					}}
					{...toAriaProps(closeAria)}
				>
					{renderSlot(props['close-icon']) ?? (
						<Icon embedded="popover.close-icon" tag={CloseIcon} />
					)}
				</Button>
			</Frame>
		</Tag>
	)
}
