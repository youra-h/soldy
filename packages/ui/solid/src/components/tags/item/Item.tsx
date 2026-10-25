import type { JSX } from 'solid-js'
import {
	Root,
	createRootProps,
	renderSlot,
	resolveSlot,
	roleIcon,
	toControlAttrs,
	toRootForward,
} from '../../../adapter'
import { Show } from '../../../adapter/runtime/flow'
import { Button } from '../../button'
import { ItemRow } from '../../item-row'
import { Icon } from '../../icon'
import { setupTagsItem } from './setup.component'
import type { TagsItemAttributes, TagsItemProps } from './base.component'

/** Глиф крестика без слота — компонент на роль: `tag` у Icon — корень, а не роль. */
const CLOSE = roleIcon('close')

/**
 * Тег: строка — `ItemRow` на `div` с набором `aria`, кнопка закрытия — её сосед:
 * потомки опции скринридеру презентационны. Выбор — по `press` строки: на клик
 * выключенный тег выбирался бы. Крестик — `Show`, а не `rendered` кнопки: скрытая
 * кнопка собирала бы у каждого тега свой контекст.
 */
export function TagsItem(props: TagsItemProps): JSX.Element {
	const binding = setupTagsItem(props)
	const state = binding.state
	const context = binding.context
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

	const row = () => toControlAttrs<TagsItemAttributes>(binding.forwardProps())

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
			<Root tag={state.tag} attributes={root} ref={binding.ref}>
				<ItemRow
					embedded="tags.row"
					tag="div"
					direction={state.direction}
					disabled={state.disabled}
					size={state.size}
					variant={state.variant}
					leading={renderSlot(props.leading)}
					trailing={renderSlot(props.trailing)}
					onActionPress={toggle}
					{...state.aria}
					{...row()}
				>
					{content() ?? state.text}
				</ItemRow>
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
			</Root>
		</Show>
	)
}
