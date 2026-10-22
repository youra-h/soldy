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
import { setupDialog } from './setup.component'
import type { DialogProps } from './base.component'

/**
 * Иконки кнопок шапки по умолчанию. Компонент на роль — один на модуль: `tag`
 * у Icon — корень, а не роль.
 */
const CLOSE = roleIcon('close')
const MAXIMIZE = roleIcon('arrowsOutward')
const RESTORE = roleIcon('arrowsInward')

/** Класс подложки — её разметка: своего экземпляра у подложки нет. */
const BACKDROP = ['so-dialog__backdrop']

/**
 * Dialog — модальное окно, как у Vue.
 *
 * Окно телепортировано целиком (`Teleport` адаптера, цель — `target`, по
 * умолчанию `body`): подложка и панель — соседи, а не обёртка и содержимое.
 * Подложка стоит в DOM раньше панели: слой у них один (одно число `z-index`
 * инлайном), и панель рисуется поверх просто порядком. В цели портал кладёт
 * свою обёртку, и обе лежат в ней. На сервере портала нет — окно появляется
 * на клиенте.
 *
 * Подложка обязательна и закрывает весь экран: фон под окном скрыт от
 * скринридера, но не от указателя, и к странице его не пускает только она.
 * Номер слоя и открытость у неё те же, что у окна (`backdropDataset`): для
 * окна под этим она — слой выше, и нажатие по ней его не закрывает, а гаснет
 * она вместе с окном. Пометки владельцем у неё нет — для своего окна нажатие
 * по ней мимо. Стиль слоя (`layout_backdropStyles`) и скрытие по `visible`
 * ей кладёт та же раскладка корня (`createRootProps`), что и панели.
 *
 * Корень — сама панель: на ней слой (`data-layer`), пометка владельцем, место
 * (`so-dialog--placement-*`), размер (`--so-dialog-width`,
 * `--so-dialog-height`), `data-open` и `data-maximized`, поверх наборов —
 * атрибуты потребителя, `ref` адаптера последним: `ref` потребителя получает
 * панель. `tabindex="-1"` — фокус встаёт на саму панель, когда внутри нечего
 * фокусировать; стоит он до спреда, и набор ядра и атрибуты потребителя его
 * перекрывают, как у Vue.
 *
 * Открытость — `visible`: закрытое окно спрятано, а не размонтировано, и
 * состояние содержимого переживает закрытие. Появление и исчезание — переход
 * темы: `data-open` у панели и подложки говорит ей, проявляться или гаснуть.
 *
 * Порядок в DOM — заголовок, тело, подвал, потом кнопки. В строку заголовка
 * кнопки переносит тема, областями сетки. Поэтому фокус при открытии попадает
 * на первый контрол содержимого, а не на «развернуть», а крестик остаётся
 * последней остановкой Tab. Заголовок рисуется всегда: на него окно ссылается
 * `aria-labelledby`, и `id` для этой ссылки он берёт из `titleAria`; пустой
 * тема сворачивает по `:empty`. Тело несёт `id` для `aria-describedby`
 * предупреждения (`bodyAria`).
 *
 * Кнопка разворота — переключатель: имя одно, состояние в `aria-pressed`
 * (`maximizeAria`), а иконок две, видна одна — по `maximized`: «развернуть»,
 * пока окно не развёрнуто, и «вернуть размер» — когда развёрнуто. Крестик
 * просит окно закрыться (`requestClose('button')`): отменить закрытие может
 * подписчик `close:before`. Кнопки шапки прячутся `rendered`, а не `visible`:
 * тема опирается на их отсутствие в DOM. Вида и размера у них нет — их красит
 * тема по контексту. По слотам иконок разметка выбирает, что рисовать,
 * поэтому их разворачивает адаптер, один раз (`resolveSlot`).
 *
 * Логики здесь нет — см. `setupDialog`.
 */
export function Dialog(props: DialogProps): JSX.Element {
	const binding = setupDialog(props)
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
	// Заголовку и телу — их наборы: своего экземпляра у них нет
	const titleAria = createPartProps(() => state.titleAria)
	const bodyAria = createPartProps(() => state.bodyAria)
	const maximizeIcon = resolveSlot(
		() => props['maximize-icon'],
		() => ({}),
	)
	const restoreIcon = resolveSlot(
		() => props['restore-icon'],
		() => ({}),
	)
	const closeIcon = resolveSlot(
		() => props['close-icon'],
		() => ({}),
	)

	return (
		<Show when={state.rendered}>
			<Teleport to={state.target}>
				<div {...backdrop()} />
				<Dynamic
					tabindex="-1"
					{...panel()}
					component={rootTag(state.tag)}
					ref={binding.ref}
				>
					<h2 class="so-dialog__title" {...titleAria()}>
						{renderSlot(props.title)}
					</h2>
					<div class="so-dialog__body" {...bodyAria()}>
						{renderSlot(props.children)}
					</div>
					<div class="so-dialog__footer">{renderSlot(props.footer)}</div>
					<Button
						embedded="dialog.maximize"
						type="button"
						class="so-dialog__maximize"
						rendered={state.maximizable}
						onClick={() => ctrl.toggleMaximized()}
						{...state.maximizeAria}
					>
						<Show
							when={state.maximized}
							fallback={
								maximizeIcon() ?? (
									<Icon embedded="dialog.maximize-icon" tag={MAXIMIZE} />
								)
							}
						>
							{restoreIcon() ?? <Icon embedded="dialog.restore-icon" tag={RESTORE} />}
						</Show>
					</Button>
					<Button
						embedded="dialog.close"
						type="button"
						class="so-dialog__close"
						rendered={state.closable}
						onClick={() => ctrl.requestClose('button')}
						{...state.closeAria}
					>
						{closeIcon() ?? <Icon embedded="dialog.close-icon" tag={CLOSE} />}
					</Button>
				</Dynamic>
			</Teleport>
		</Show>
	)
}
