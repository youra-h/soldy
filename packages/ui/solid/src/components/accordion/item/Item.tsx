import type { Accessor, JSX } from 'solid-js'
import {
	Root,
	clickAction,
	createPartProps,
	createRootProps,
	renderSlot,
	resolveSlot,
	roleIcon,
	toControlAttrs,
	toRootForward,
} from '../../../adapter'
import { Show } from '../../../adapter/runtime/flow'
import { Button } from '../../button'
import { Icon } from '../../icon'
import { setupAccordionItem } from './setup.component'
import type { AccordionItemAttributes, AccordionItemProps } from './base.component'

/** Стрелка без слота — иконка по роли. */
const ARROW = roleIcon('arrowRight')

/**
 * Секция: заголовок — Button с `aria`, панель — узел с набором `contentAria`. Класс
 * стрелки — на обёртке, а не на иконке: тема поворачивает и подменённую слотом.
 */
export function AccordionItem(props: AccordionItemProps): JSX.Element {
	const binding = setupAccordionItem(props)
	const state = binding.state
	const context = binding.context
	const root = createRootProps(() => ({
		state,
		sets: [state.dataset, state.attrs],
		forward: toRootForward(binding.forwardProps()),
	}))
	const contentAria = createPartProps(() => state.contentAria)
	const title = resolveSlot(
		() => props.header,
		() => ({ item: binding.ctrl, text: state.text ?? '', selected: state.selected ?? false }),
	)
	const leadingIcon = resolveSlot(
		() => props['leading-icon'],
		() => ({ item: binding.ctrl }),
	)
	const trailingIcon = resolveSlot(
		() => props['trailing-icon'],
		() => ({ item: binding.ctrl }),
	)

	/** The header's attributes: all of the consumer's but the class and the style. */
	const header = () => toControlAttrs<AccordionItemAttributes>(binding.forwardProps())
	const toggle = clickAction(() => context?.adapters.selection.toggle())

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
			<Root tag={state.tag} attributes={root} ref={binding.ref}>
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
					ref={toggle}
					leading={
						<>
							{arrow('start', leadingIcon)}
							{renderSlot(props.leading, { item: binding.ctrl })}
						</>
					}
					trailing={
						<>
							{renderSlot(props.trailing, { item: binding.ctrl })}
							{arrow('end', trailingIcon)}
						</>
					}
				>
					{title() ?? state.text}
				</Button>
				<div class="so-accordion-item__body">
					<div class="so-accordion-item__content" {...contentAria()}>
						{renderSlot(props.children, { item: binding.ctrl })}
					</div>
				</div>
			</Root>
		</Show>
	)
}
