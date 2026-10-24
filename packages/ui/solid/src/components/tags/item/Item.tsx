import type { JSX } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import {
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
import { setupTagsItem } from './setup.component'
import type { TagsItemAttributes, TagsItemProps } from './base.component'

/** Глиф крестика без слота — компонент на роль: `tag` у Icon — корень, а не роль. */
const CLOSE = roleIcon('close')

/**
 * Тег: строка — `Button` над экземпляром тега (`row`, `TOwnedButton` на `div`) с набором
 * `aria`, кнопка закрытия — её сосед: потомки опции скринридеру презентационны. Размер,
 * вариант, выключенность и направление строке пишет тег, а роль и `tabindex` — его набор
 * `aria`. Выбор — по `press` строки: на клик выключенный тег выбирался бы.
 * Крестик — `Show`, а не `rendered` кнопки: скрытая кнопка собирала бы у каждого тега
 * свой контекст.
 */
export function TagsItem(props: TagsItemProps): JSX.Element {
	const binding = setupTagsItem(props)
	const state = binding.state
	const context = binding.context
	const row = binding.row
	const root = createRootProps(() => ({
		state,
		sets: [state.dataset, state.attrs],
		forward: toRootForward(binding.forwardProps()),
	}))
	const content = resolveSlot(
		() => props.children,
		() => ({ text: state.text ?? '', selected: state.selected ?? false }),
	)
	const closeIcon = resolveSlot(
		() => props['close-icon'],
		() => ({}),
	)

	const rowAttrs = () => toControlAttrs<TagsItemAttributes>(binding.forwardProps())

	function toggle(): void {
		context?.adapters.selection.toggle()
	}

	/** Всплытие гасится здесь: `onClick` Solid делегирует документу, там гасить поздно. */
	function close(event: MouseEvent): void {
		event.stopPropagation()
		context?.adapters.tags.close()
	}

	return (
		<Show when={state.rendered}>
			<Dynamic {...root()} component={rootTag(state.tag)} ref={binding.ref}>
				<Button
					embedded="tags.row"
					ctrl={row}
					leading={renderSlot(props.leading)}
					trailing={renderSlot(props.trailing)}
					onActionPress={toggle}
					{...state.aria}
					{...rowAttrs()}
				>
					{content() ?? state.text}
				</Button>
				<Show when={state.tag_closable === true}>
					<Button
						embedded="tags.close"
						type="button"
						class="so-tags-item__close"
						disabled={state.disabled}
						size={state.size}
						{...state.closeAria}
						onActionClick={close}
					>
						{closeIcon() ?? (
							<Icon embedded="tags.close-icon" tag={CLOSE} size={state.size} />
						)}
					</Button>
				</Show>
			</Dynamic>
		</Show>
	)
}
