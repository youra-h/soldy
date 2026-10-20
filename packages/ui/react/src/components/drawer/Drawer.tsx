import type { ElementType, ReactElement } from 'react'
import {
	Teleport,
	renderSlot,
	roleIcon,
	toAriaProps,
	toRootLayout,
	toRootProps,
} from '../../adapter'
import { Button } from '../button'
import { Icon } from '../icon'
import { useSetupDrawer } from './setup.component'
import type { DrawerProps } from './base.component'

/** Иконка крестика — компонент на роль, один на модуль (`roleIcon`). */
const CloseIcon = roleIcon('close')

/**
 * Drawer — выезжающая панель у края экрана или контейнера.
 *
 * Анатомия — как у модального окна: подложка и панель — соседи, а не обёртка
 * и содержимое. Подложка стоит в DOM раньше панели: слой у них один (одно
 * число `z-index` инлайном), и панель рисуется поверх просто порядком.
 * Нажатие по подложке для плагинов слоя — нажатие мимо корня. Номер слоя,
 * открытость и место у подложки те же, что у панели (`backdropDataset`): она
 * гаснет вместе с панелью и внутри контейнера накрывает только его. Стиль
 * слоя и скрытие ей кладёт раскладка корня (`toRootLayout`), как панели.
 *
 * Поверх страницы обе уходят телепортом (`Teleport` адаптера) в цель
 * `target`; на сервере портала нет, и панель появляется после гидратации.
 * `contained` выключает телепорт: панель и подложка остаются на месте, в
 * разметке родителя, — и на сервере тоже, — и тема ставит их в ближайший
 * позиционированный предок. Портал и место — разные позиции дерева React,
 * поэтому смена `contained` на лету рисует панель заново, с новым узлом и
 * новым содержимым, как у Frame; инстанс и открытость остаются.
 *
 * Корень — сама панель: на ней слой (`data-layer`), пометка владельцем, край
 * (`so-drawer--placement-*`), размер (`--so-drawer-width`,
 * `--so-drawer-height`), `data-open`, `data-swiping` и `data-contained`,
 * атрибуты и `ref` потребителя. Сдвиг во время жеста (`--so-swipe-offset`)
 * плагин жеста пишет в неё сам. `tabIndex={-1}` — фокус встаёт на саму
 * панель, когда внутри нечего фокусировать.
 *
 * Порядок в DOM — полоса, заголовок, тело, подвал, потом крестик: фокус при
 * открытии попадает на первый контрол содержимого, а крестик — последняя
 * остановка Tab. Полоса у края, за которую тянут, рисуется, пока жест включён
 * (`handleRendered`), немая для скринридера. Заголовок рисуется всегда: на
 * него панель ссылается `aria-labelledby` (`titleAria`). Крестик просит панель
 * закрыться (`requestClose('button')`) и прячется `rendered`, а не `visible`:
 * тема опирается на его отсутствие в DOM.
 */
export function Drawer(props: DrawerProps): ReactElement | null {
	const { ctrl, ref, forwardProps, state } = useSetupDrawer(props)

	const {
		rendered,
		tag,
		target,
		contained,
		visible,
		attrs,
		aria,
		dataset,
		titleAria,
		closable,
		closeAria,
		handleRendered,
		backdropDataset,
		layout_backdropStyles,
		dismiss_ownerAttribute,
	} = state

	if (!rendered) return null

	const Tag = tag as ElementType

	return (
		<Teleport to={target} disabled={contained}>
			<div
				{...toAriaProps(backdropDataset)}
				{...toRootLayout(
					{ layout_styles: layout_backdropStyles, visible },
					{ className: 'so-drawer__backdrop' },
				)}
			/>
			<Tag
				tabIndex={-1}
				{...toRootProps(
					ref,
					state,
					[attrs, aria, dataset, dismiss_ownerAttribute],
					forwardProps,
				)}
			>
				{handleRendered ? <div className="so-drawer__handle" aria-hidden="true" /> : null}
				<h2 className="so-drawer__title" {...toAriaProps(titleAria)}>
					{renderSlot(props.title)}
				</h2>
				<div className="so-drawer__body">{renderSlot(props.children)}</div>
				<div className="so-drawer__footer">{renderSlot(props.footer)}</div>
				<Button
					embedded="drawer.close"
					type="button"
					className="so-drawer__close"
					rendered={closable}
					onClick={() => ctrl.requestClose('button')}
					{...toAriaProps(closeAria)}
				>
					{renderSlot(props['close-icon']) ?? (
						<Icon embedded="drawer.close-icon" tag={CloseIcon} />
					)}
				</Button>
			</Tag>
		</Teleport>
	)
}
