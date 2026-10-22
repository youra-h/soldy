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
 * TagsItem — тег: корень по `tag` (по умолчанию `div`), внутри строка —
 * `Button` на `div` — и кнопка закрытия рядом с ней, как у Vue.
 *
 * Наборы ядра стоят там же, где у Vue. Корень — пилюля тега: на нём `dataset`
 * (тема красит выбранный тег по `data-selected`), `attrs` и место в коллекции
 * (`order`). Вид набора рисует корень, а не строка: фон, рамка, наведение и
 * выбор обязаны покрывать и крестик, а он стоит рядом со строкой. Строке и
 * крестику вид не передаётся — части тега тема красит по контексту
 * (`.so-tags-item`).
 *
 * Строка несёт `aria` — роль по режиму набора (`listitem` без выбора, `option`
 * с выбором), `aria-selected` и `tabindex` от коллекции: с выбором весь набор
 * — одна остановка Tab, без выбора у строк `-1`. Набор перекрывает остановку,
 * которую `Button` на `div` ставит себе сам. Атрибуты потребителя делятся, как
 * у Vue: класс и стиль — корню, остальное — строке, поверх её `aria`.
 * `direction` — явно: строка — свой узел, и направление письма ей передаётся,
 * а не только наследуется. Тег строки фиксирован (`div`): `tag` — тег корня,
 * под фиксированный тег строки написан `TTagsItem._ariaTag`.
 *
 * Выбор — по `action:press` строки, а не по клику: строка — `div`, фокус
 * держит она сама, и клик из Enter и пробела на ней делает её
 * `TActionPlugin`. `press` не приходит на выключенный тег, а
 * `TSelectionExtension.toggle` выключенность не проверяет — на клик
 * выключенный тег выбирался бы.
 *
 * Кнопка закрытия — сосед строки, а не её часть: потомки опции для
 * скринридера презентационны, и подпись крестика приклеилась бы к названию
 * тега. Имя кнопке ядро собирает вместе с текстом тега (`closeAria`), в том же
 * наборе — `tabindex="-1"` с выбором. Рисуется она по итогу закрываемости
 * фасада (`tag_closable`), размер и `disabled` — явно: от строки она их не
 * наследует. Рисует её `<Show>`, а не `rendered` кнопки: тело компонента Solid
 * выполняется сразу, и скрытая кнопка собирала бы у каждого тега свой
 * контекст и иконку крестика.
 *
 * Закрывает кнопка по `onActionClick` — нативному клику её `TActionPlugin` — и
 * гасит всплытие у самого события, как Vue `@click.stop`: `onClick` Solid
 * делегирует документу, и гасить всплытие там поздно — событие уже прошло
 * корни тега и набора, их `TActionPlugin` отдал бы `action:press` на клик по
 * крестику, а поле Select, в котором стоят теги, открыло бы по нему панель.
 *
 * По слотам `default` и `close-icon` разметка выбирает, что рисовать,
 * поэтому их разворачивает адаптер, один раз (`resolveSlot`): пустое, что
 * вернул проброс набора, уступает место своему — тексту и иконке.
 */
export function TagsItem(props: TagsItemProps): JSX.Element {
	const binding = setupTagsItem(props)
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
		() => ({ text: state.text ?? '', selected: state.selected ?? false }),
	)
	const closeIcon = resolveSlot(
		() => props['close-icon'],
		() => ({}),
	)

	/** Атрибуты строки — всё от потребителя, кроме класса и стиля. */
	const row = () => toControlAttrs<TagsItemAttributes>(binding.forwardProps())

	function toggle(): void {
		context?.adapters.selection.toggle()
	}

	function close(event: MouseEvent): void {
		event.stopPropagation()
		context?.adapters.tags.close()
	}

	return (
		<Show when={state.rendered}>
			<Dynamic {...root()} component={rootTag(state.tag)} ref={binding.ref}>
				<Button
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
