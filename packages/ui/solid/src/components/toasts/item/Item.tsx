import { Show, type Component, type JSX } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import type { TToastsItemType } from '@soldy-ui/core'
import {
	createRootProps,
	isToastRender,
	resolveSlot,
	roleIcon,
	rootTag,
	type TRoleIconProps,
	type TToastRender,
} from '../../../adapter'
import { Button } from '../../button'
import { Icon } from '../../icon'
import { ProgressSpinner } from '../../progress-spinner'
import { setupToastsItem } from './setup.component'
import type { ToastsItemProps } from './base.component'

/**
 * Значок вида — по роли, своей у каждого вида: в режиме принудительных цветов
 * вид различает только глиф. Роль выбирает разметка, как отметку CheckBox,
 * тема значок только красит. Таблица закрыта по виду (`satisfies`): новый вид
 * без своего значка не соберётся. Компонент на роль — один на модуль: `tag` у
 * Icon — корень, а не роль.
 */
const TYPE_ICONS = {
	info: roleIcon('info'),
	success: roleIcon('success'),
	warning: roleIcon('warning'),
	error: roleIcon('error'),
} satisfies Record<TToastsItemType, Component<TRoleIconProps>>

/** Значок обычного сообщения — тоста без вида. */
const NOTIFICATION = roleIcon('notification')

/** Иконка крестика по умолчанию. */
const CLOSE = roleIcon('close')

/**
 * ToastsItem — тост, внутренняя часть менеджера, как у Vue: его рисует только
 * регион `Toasts`, по одному на показанный элемент коллекции, и наружу пакета
 * он не выходит.
 *
 * Корень — место тоста в списке (по `tag`, по умолчанию `li`): высота места,
 * сдвиг жеста, уход и прозрачность (тема). На нём: вид сообщения —
 * модификатор `so-toasts-item--type-*`, `data-open` (с первой отрисовки;
 * `false` — тост закрыт и гаснет), `data-swiping`, роль `status` или `alert`
 * для срочного, `tabindex` — фокус по F8 и Escape на тосте под фокусом.
 * Атрибуты снаружи — поверх наборов, `ref` адаптера последним. Сдвиг во
 * время жеста (`--so-swipe-offset`) плагин жеста пишет сюда сам.
 *
 * Глубина в стопке (`--so-toasts-depth`) — место тоста в составе, `order`
 * фасада: в стопке передний — первый. Своего CSS-свойства `order` у тоста нет,
 * как у Vue: порядок узлов в регионе и есть порядок коллекции. Состояние двух
 * контекстов (`joinState`) несёт `order` фасада, и раскладка корня поставила
 * бы его свойством `order`, — поэтому ей оно отдаётся поимённо, без `order`, а
 * глубина уходит стиль-выходом.
 *
 * Плашка — то, что видно: поверхность, кромка, тень и кольцо фокуса корня.
 * Отдельный узел, а не корень: место растёт и схлопывается переходом высоты
 * без замеров, а плашка своего размера не меняет.
 *
 * Коробка значка стоит всегда, и в ней одно из трёх: пока тост ждёт
 * (`loading`) — бегущее кольцо, при любом виде и что бы ни дал слот; задан
 * слот `icon` (scope — вид) — свой значок; иначе — значок вида по роли.
 * Пустое, что вернул слот, уступает место значку вида, как пустые
 * слоты-иконки у элементов коллекций. Коробка — декор: что случилось, говорит
 * текст, поэтому она спрятана от скринридера вместе с ролью кольца.
 *
 * Текст — заголовок (слот `children` со scope `{ text }`, запасное — `text`
 * тоста), описание (`description`) и своё содержимое (слот `content`,
 * запасное — `render` тоста: компонент Solid, тост приходит ему пропом
 * `toast`, и рисуется он, только когда это компонент, — `isToastRender`).
 * Пустую часть тема сворачивает по `:empty`.
 *
 * Крестик — последним в DOM: последняя остановка Tab в тосте. Прячется
 * `rendered` (`closable`), имя — из локали вместе с текстом тоста
 * (`closeAria`). Вида и размера у него нет: квадрат и вид даёт тема по
 * контексту.
 *
 * По слотам разметка выбирает, что рисовать, поэтому их разворачивает
 * адаптер, один раз (`resolveSlot`): пустое, что вернул проброс менеджера,
 * уступает место своему — значку вида, тексту, `render`, иконке крестика.
 */
export function ToastsItem(props: ToastsItemProps): JSX.Element {
	const binding = setupToastsItem(props)
	const state = binding.state
	const ctrl = binding.ctrl
	// Состояние — поимённо, без `order` фасада; глубина — стиль-выходом
	const root = createRootProps(() => ({
		state: { classes: state.classes, visible: state.visible },
		sets: [state.attrs, state.aria, state.dataset],
		forward: binding.forwardProps(),
		style: { '--so-toasts-depth': state.order ?? '' },
	}))
	const icon = resolveSlot(
		() => props.icon,
		() => ({ type: state.type }),
	)
	const text = resolveSlot(
		() => props.children,
		() => ({ text: state.text ?? '' }),
	)
	const content = resolveSlot(
		() => props.content,
		() => ({}),
	)
	const closeIcon = resolveSlot(
		() => props['close-icon'],
		() => ({}),
	)

	/** Своё содержимое — когда `render` тоста компонент Solid; иначе его нет. */
	const render = (): TToastRender | undefined =>
		isToastRender(state.render) ? state.render : undefined

	return (
		<Show when={state.rendered}>
			<Dynamic {...root()} component={rootTag(state.tag)} ref={binding.ref}>
				<div class="so-toasts-item__card">
					<span class="so-toasts-item__icon" aria-hidden="true">
						<Show
							when={!state.loading}
							fallback={<ProgressSpinner embedded="toasts.spinner" indeterminate />}
						>
							{icon() ?? (
								<Icon
									embedded="toasts.icon"
									tag={state.type ? TYPE_ICONS[state.type] : NOTIFICATION}
								/>
							)}
						</Show>
					</span>
					<div class="so-toasts-item__body">
						<div class="so-toasts-item__text">{text() ?? state.text}</div>
						<div class="so-toasts-item__description">{state.description}</div>
						<div class="so-toasts-item__content">
							{content() ?? <Dynamic component={render()} toast={ctrl} />}
						</div>
					</div>
					<Button
						embedded="toasts.close"
						type="button"
						class="so-toasts-item__close"
						rendered={state.closable}
						onClick={() => ctrl.close()}
						{...state.closeAria}
					>
						{closeIcon() ?? <Icon embedded="toasts.close-icon" tag={CLOSE} />}
					</Button>
				</div>
			</Dynamic>
		</Show>
	)
}
