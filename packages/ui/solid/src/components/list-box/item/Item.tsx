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
import { setupListBoxItem } from './setup.component'
import type { ListBoxItemAttributes, ListBoxItemProps } from './base.component'

/** Отметка без слота — иконка из пакета по роли, компонент на роль один на модуль. */
const CHECK = roleIcon('check')

/**
 * ListBoxItem — элемент списка: корень по `tag` (по умолчанию `div`) и строка
 * внутри — `Button`, как у Vue.
 *
 * Наборы ядра стоят на двух элементах. Корень несёт `dataset`, `attrs` и место
 * в коллекции (`order`): тема читает `data-content-fit` с него. Строка несёт
 * `aria` и тот же `dataset` — выбор и подсветку тема красит на `.so-button`.
 * Атрибуты потребителя делятся так же, как у Vue: класс и стиль — корню,
 * остальное — строке, поверх её наборов: `tabindex="-1"` элемента перекрывает
 * `tabindex="0"`, который кнопка на `div` ставит себе сама.
 *
 * Тег строки фиксирован (`div`), а не берётся из `tag` элемента: `tag` — тег
 * корня, под фиксированный тег строки написан `TListBoxItem._ariaTag`.
 *
 * Клик выбирает через `adapters.list.choose()`, а не `selection.toggle()`:
 * выключенному элементу отказывает список, тем же путём, что и клавиатура.
 * Клик потребителя приходит после выбора — как у Vue, где слушатели
 * складываются (`chainHandler`).
 *
 * Обёртка отметки рисуется, пока `indicator` не `none`, — и у невыбранных
 * тоже: она резервирует место. Иконка внутри — только у выбранного, слот
 * `indicator-icon` подменяет её. `aria-hidden`: состояние скринридеру
 * объявляет `aria-selected`, второй источник того же факта дал бы двойное
 * объявление.
 *
 * По слотам `default` и `indicator-icon` разметка выбирает, что рисовать,
 * поэтому их разворачивает адаптер, один раз (`resolveSlot`): пустое, что
 * вернул проброс списка, уступает место своему — тексту и иконке.
 */
export function ListBoxItem(props: ListBoxItemProps): JSX.Element {
	const binding = setupListBoxItem(props)
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
	const indicatorIcon = resolveSlot(
		() => props['indicator-icon'],
		() => ({ selected: state.selected ?? false }),
	)

	/** Атрибуты строки — всё от потребителя, кроме класса и стиля; клик — сначала выбор. */
	const row = () => {
		const { onClick, ...attributes } = toControlAttrs<ListBoxItemAttributes>(
			binding.forwardProps(),
		)

		return {
			...attributes,
			onClick: chainHandler(() => context?.adapters.list.choose(), onClick),
		}
	}

	const mark = () => (
		<span class="so-list-box-item__indicator" aria-hidden="true">
			{indicatorIcon() ??
				(state.selected ? (
					<Icon embedded="list-box.indicator" tag={CHECK} size={state.size} />
				) : null)}
		</span>
	)

	return (
		<Show when={state.rendered}>
			<Dynamic {...root()} component={rootTag(state.tag)} ref={binding.ref}>
				<Button
					embedded="list-box.row"
					tag="div"
					view={state.view}
					disabled={state.disabled}
					size={state.size}
					variant={state.variant}
					{...state.aria}
					{...state.dataset}
					{...row()}
					leading={
						<>
							{state.indicator === 'start' ? mark() : null}
							{renderSlot(props.leading)}
						</>
					}
					trailing={
						<>
							{renderSlot(props.trailing)}
							{state.indicator === 'end' ? mark() : null}
						</>
					}
				>
					{content() ?? state.text}
				</Button>
			</Dynamic>
		</Show>
	)
}
