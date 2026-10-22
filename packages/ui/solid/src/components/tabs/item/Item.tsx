import type { JSX } from 'solid-js'
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
import { Show } from '../../../adapter/runtime/flow'
import { Button } from '../../button'
import { Icon } from '../../icon'
import { setupTabsItem } from './setup.component'
import type { TabsItemAttributes, TabsItemProps } from './base.component'

/** Глиф крестика без слота — компонент на роль: `tag` у Icon — корень, а не роль. */
const CLOSE = roleIcon('close')

/**
 * TabsItem — таб: корень по `tag` (по умолчанию `div`), внутри строка —
 * `Button` с `role="tab"` — и кнопка закрытия рядом с ней, как у Vue.
 *
 * Наборы ядра стоят там же, где у Vue. Корень несёт `dataset`, `attrs` и место
 * в коллекции (`order`): тема красит активный таб по `data-selected` на нём.
 * Строка несёт `aria` — вся ARIA таба на элементе, который и есть таб: роль от
 * ядра, `aria-selected` и остановку Tab (`tabindex`) от коллекции, связку с
 * панелью (`id`, `aria-controls`). Атрибуты потребителя делятся, как у
 * ListBox.Item: класс и стиль — корню, остальное — строке, поверх её `aria`.
 *
 * Клик строки активирует таб, потом зовёт клик потребителя — как у Vue, где
 * слушатели складываются (`chainHandler`).
 *
 * Кнопка закрытия — сосед строки, а не её часть: интерактивный потомок у
 * `<button role="tab">` HTML запрещает, а подпись крестика вошла бы в имя
 * таба. Имя кнопке ядро собирает вместе с текстом таба (`closeAria`),
 * рисуется она по итогу закрываемости фасада (`tab_closable`), размер и
 * `disabled` — явно: от строки она их не наследует. Рисует её `<Show>`, а не
 * `rendered` кнопки: тело компонента Solid выполняется сразу, и скрытая
 * кнопка собирала бы у каждого таба свой контекст и иконку крестика.
 *
 * Закрывает кнопка по `onActionClick` — нативному клику её `TActionPlugin` — и
 * гасит всплытие у самого события, как Vue `@click.stop`: `onClick` Solid
 * делегирует документу, и гасить всплытие там поздно — событие уже прошло
 * корни таба и набора, и их `TActionPlugin` отдал бы `action:press` на клик по
 * крестику.
 *
 * По слотам `default` и `close-icon` разметка выбирает, что рисовать,
 * поэтому их разворачивает адаптер, один раз (`resolveSlot`): пустое, что
 * вернул проброс набора, уступает место своему — тексту и иконке.
 */
export function TabsItem(props: TabsItemProps): JSX.Element {
	const binding = setupTabsItem(props)
	const state = binding.state
	const context = binding.context
	// Корню — его наборы, класс и стиль потребителя; `ref` адаптера последним
	const root = createRootProps(() => ({
		state,
		sets: [state.dataset, state.attrs],
		forward: toRootForward(binding.forwardProps()),
	}))
	const content = resolveSlot(
		() => props.children,
		() => ({ text: state.text ?? '', active: state.active ?? false }),
	)
	const closeIcon = resolveSlot(
		() => props['close-icon'],
		() => ({}),
	)

	/** Атрибуты строки — всё от потребителя, кроме класса и стиля; клик — сначала активация. */
	const row = () => {
		const { onClick, ...attributes } = toControlAttrs<TabsItemAttributes>(
			binding.forwardProps(),
		)
		const activate = () => {
			if (context) context.adapters.activation.active = true
		}

		return { ...attributes, onClick: chainHandler(activate, onClick) }
	}

	function close(event: MouseEvent): void {
		event.stopPropagation()
		context?.adapters.tabs.close()
	}

	return (
		<Show when={state.rendered}>
			<Dynamic {...root()} component={rootTag(state.tag)} ref={binding.ref}>
				<Button
					embedded="tabs.row"
					type="button"
					disabled={state.disabled}
					size={state.size}
					variant={state.variant}
					leading={renderSlot(props.leading)}
					trailing={renderSlot(props.trailing)}
					{...state.aria}
					{...row()}
				>
					{content() ?? state.text}
				</Button>
				<Show when={state.tab_closable === true}>
					<Button
						embedded="tabs.close"
						type="button"
						class="so-tabs-item__close"
						disabled={state.disabled}
						size={state.size}
						{...state.closeAria}
						onActionClick={close}
					>
						{closeIcon() ?? (
							<Icon embedded="tabs.close-icon" tag={CLOSE} size={state.size} />
						)}
					</Button>
				</Show>
			</Dynamic>
		</Show>
	)
}
