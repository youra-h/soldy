import { Show, type Accessor, type JSX } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import {
	chainHandler,
	createRootProps,
	renderSlot,
	resolveSlot,
	roleIcon,
	rootTag,
	toControlAttrs,
	toRootForward,
} from '../../../adapter'
import { Button } from '../../button'
import { Icon } from '../../icon'
import { setupAccordionItem } from './setup.component'
import type { AccordionItemAttributes, AccordionItemProps } from './base.component'

/** Стрелка без слота — иконка из пакета по роли, компонент на роль один на модуль. */
const ARROW = roleIcon('arrowRight')

/**
 * AccordionItem — секция: корень по `tag` (по умолчанию `div`), внутри
 * заголовок — `Button` — и панель, как у Vue.
 *
 * Наборы ядра стоят там же, где у Vue. Корень несёт `dataset`, `attrs` и место
 * в коллекции (`order`): тема раскрывает панель по `data-selected` на нём.
 * Заголовок несёт `aria` — `aria-expanded` пишет коллекция, сторону связки с
 * панелью (`id`, `aria-controls`) — плагин секции. Панель несёт набор секции
 * `contentAria` (`role="region"`, `id`, `aria-labelledby`): своего экземпляра
 * у неё нет. Атрибуты потребителя делятся, как у ListBox.Item: класс и стиль —
 * корню, остальное — заголовку, поверх его `aria`.
 *
 * Клик заголовка раскрывает или сворачивает секцию, потом зовёт клик
 * потребителя — как у Vue, где слушатели складываются (`chainHandler`).
 *
 * Стрелка — по краю заголовка со стороны `arrowPlacement`. Слоты
 * `leading-icon` и `trailing-icon` подменяют её, по умолчанию она — иконка
 * пакета по роли `arrowRight`. Стрелка — в обёртке, и класс стрелки на
 * обёртке, а не на иконке: тема поворачивает стрелку раскрытой секции по
 * `.so-accordion-item__arrow`, и подменённая иконка поворачивается так же.
 * Обёртка стоит, пока на её стороне стрелка по умолчанию или задан слот.
 *
 * По слотам заголовка и стрелок разметка выбирает, что рисовать, поэтому их
 * разворачивает адаптер, один раз (`resolveSlot`): пустое, что вернул проброс
 * аккордеона, уступает место своему — тексту и стрелке.
 */
export function AccordionItem(props: AccordionItemProps): JSX.Element {
	const binding = setupAccordionItem(props)
	const state = binding.state
	const context = binding.context
	// Корню — его наборы, класс и стиль потребителя; `ref` адаптера последним
	const root = createRootProps(() => ({
		state,
		sets: [state.dataset, state.attrs],
		forward: toRootForward(binding.forwardProps()),
	}))
	const title = resolveSlot(
		() => props.header,
		() => ({ text: state.text ?? '', selected: state.selected ?? false }),
	)
	const leadingIcon = resolveSlot(
		() => props['leading-icon'],
		() => ({}),
	)
	const trailingIcon = resolveSlot(
		() => props['trailing-icon'],
		() => ({}),
	)

	/** Атрибуты заголовка — всё от потребителя, кроме класса и стиля; клик — сначала раскрытие. */
	const header = () => {
		const { onClick, ...attributes } = toControlAttrs<AccordionItemAttributes>(
			binding.forwardProps(),
		)

		return {
			...attributes,
			onClick: chainHandler(() => context?.adapters.selection.toggle(), onClick),
		}
	}

	/** Стрелка стороны: слот, а без него — иконка, если стрелка на этой стороне. */
	const arrow = (side: 'start' | 'end', icon: Accessor<JSX.Element | undefined>) => (
		<Show when={icon() !== undefined || state.arrowPlacement === side}>
			<span class="so-accordion-item__arrow">
				{icon() ?? <Icon embedded="accordion.arrow" tag={ARROW} size={state.size} />}
			</span>
		</Show>
	)

	return (
		<Show when={state.rendered}>
			<Dynamic {...root()} component={rootTag(state.tag)} ref={binding.ref}>
				<Button
					embedded="accordion.header"
					type="button"
					class="so-accordion-item__header"
					view={state.view}
					disabled={state.disabled}
					size={state.size}
					variant={state.variant}
					{...state.aria}
					{...header()}
					leading={
						<>
							{arrow('start', leadingIcon)}
							{renderSlot(props.leading)}
						</>
					}
					trailing={
						<>
							{renderSlot(props.trailing)}
							{arrow('end', trailingIcon)}
						</>
					}
				>
					{title() ?? state.text}
				</Button>
				<div class="so-accordion-item__body">
					<div class="so-accordion-item__content" {...state.contentAria}>
						{renderSlot(props.children)}
					</div>
				</div>
			</Dynamic>
		</Show>
	)
}
