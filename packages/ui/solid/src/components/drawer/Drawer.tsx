import { Show, type JSX } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import {
	Teleport,
	createPartProps,
	createRootProps,
	renderSlot,
	resolveSlot,
	roleIcon,
	rootTag,
} from '../../adapter'
import { Button } from '../button'
import { Icon } from '../icon'
import { setupDrawer } from './setup.component'
import type { DrawerProps } from './base.component'

/**
 * Иконка кнопки закрытия по умолчанию. Компонент на роль — один на модуль:
 * `tag` у Icon — корень, а не роль.
 */
const CLOSE = roleIcon('close')

/** Класс подложки — её разметка: своего экземпляра у подложки нет. */
const BACKDROP = ['so-drawer__backdrop']

/**
 * Drawer — выезжающая панель у края экрана, как у Vue. Анатомия — как у
 * модального окна: подложка и панель — соседи, а не обёртка и содержимое.
 * Подложка стоит в DOM раньше панели: слой у них один (одно число `z-index`
 * инлайном), и панель рисуется поверх просто порядком. Нажатие по подложке для
 * плагинов слоя — нажатие мимо корня.
 *
 * Обе уходят телепортом в цель слоя (`target`, по умолчанию `body`), в
 * обёртку портала, а `contained` телепорт выключает: панель и подложка
 * остаются на месте, в разметке родителя, — и на сервере тоже, — и тема
 * ставит их в ближайший позиционированный предок. Цели телепорта тогда нет —
 * `target` не действует. Смена `contained` и цели переносит панель с
 * подложкой теми же узлами: содержимое `Teleport` разворачивает один раз, и
 * набранное в поле панели остаётся.
 *
 * Номер слоя, открытость и место у подложки те же, что у панели
 * (`backdropDataset`, `z-index` из `layout_backdropStyles`): она гаснет вместе
 * с панелью и внутри контейнера накрывает только его. Пометки владельцем у
 * неё нет — для своей панели она мимо.
 *
 * Корень — сама панель: на ней слой (`data-layer`), пометка владельцем, край
 * (`so-drawer--placement-*`), размер переменными (`layout_styles`),
 * `data-open`, `data-swiping` и `data-contained`, поверх наборов — атрибуты
 * потребителя, `ref` адаптера последним: `ref` потребителя получает панель.
 * Сдвиг во время жеста (`--so-swipe-offset`) плагин жеста пишет в неё сам:
 * стиль корня Solid ставит по свойствам и его не стирает. `tabindex="-1"` —
 * фокус встаёт на саму панель, когда внутри нечего фокусировать; набор ядра и
 * атрибуты потребителя его перекрывают. Открытость — `visible`: закрытая
 * панель спрятана, а не размонтирована.
 *
 * Порядок в DOM — полоса жеста, заголовок, тело, подвал, потом крестик: фокус
 * при открытии попадает на первый контрол содержимого, а крестик — последняя
 * остановка Tab. Полоса у края, за которую тянут, стоит, пока жест включён
 * (`handleRendered`): она говорит, что панель можно смахнуть, и сама ничего
 * не делает — потребитель её не адресует, скринридеру она не нужна
 * (`aria-hidden`). Заголовок рисуется всегда — на него панель ссылается
 * `aria-labelledby` (`titleAria`); пустой заголовок и подвал тема сворачивает
 * по `:empty`. Крестик просит панель закрыться (`requestClose('button')`) и
 * прячется `rendered`: тема опирается на его отсутствие в DOM. Значок — слот
 * `close-icon`, по умолчанию — иконка роли `close`; по слоту разметка
 * выбирает, что рисовать, поэтому его разворачивает адаптер, один раз
 * (`resolveSlot`).
 *
 * Логики здесь нет — см. `setupDrawer`.
 */
export function Drawer(props: DrawerProps): JSX.Element {
	const binding = setupDrawer(props)
	const state = binding.state
	const ctrl = binding.ctrl
	// Подложке — её класс, стиль слоя, скрытие и набор; атрибутов потребителя у неё нет
	const backdrop = createRootProps(() => ({
		state: {
			classes: BACKDROP,
			layout_styles: state.layout_backdropStyles,
			visible: state.visible,
		},
		sets: [state.backdropDataset],
		forward: {},
	}))
	// Панели — наборы ядра, поверх — атрибуты снаружи, `ref` адаптера последним
	const panel = createRootProps(() => ({
		state,
		sets: [state.attrs, state.aria, state.dataset, state.dismiss_ownerAttribute],
		forward: binding.forwardProps(),
	}))
	// Заголовку — его набор: своего экземпляра у него нет
	const titleAria = createPartProps(() => state.titleAria)
	const closeIcon = resolveSlot(
		() => props['close-icon'],
		() => ({}),
	)

	return (
		<Show when={state.rendered}>
			<Teleport to={state.target} disabled={state.contained}>
				<div {...backdrop()} />
				<Dynamic
					tabindex="-1"
					{...panel()}
					component={rootTag(state.tag)}
					ref={binding.ref}
				>
					<Show when={state.handleRendered}>
						<div class="so-drawer__handle" aria-hidden="true" />
					</Show>
					<h2 class="so-drawer__title" {...titleAria()}>
						{renderSlot(props.title)}
					</h2>
					<div class="so-drawer__body">{renderSlot(props.children)}</div>
					<div class="so-drawer__footer">{renderSlot(props.footer)}</div>
					<Button
						embedded="drawer.close"
						type="button"
						class="so-drawer__close"
						rendered={state.closable}
						onClick={() => ctrl.requestClose('button')}
						{...state.closeAria}
					>
						{closeIcon() ?? <Icon embedded="drawer.close-icon" tag={CLOSE} />}
					</Button>
				</Dynamic>
			</Teleport>
		</Show>
	)
}
