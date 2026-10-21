import { Show, type JSX } from 'solid-js'
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
import { Button } from '../../button'
import { Icon } from '../../icon'
import { setupSelectItem } from './setup.component'
import type { SelectItemAttributes, SelectItemProps } from './base.component'

/** Отметка без слота — иконка из пакета по роли, компонент на роль один на модуль. */
const CHECK = roleIcon('check')

/**
 * SelectItem — опция списка панели: корень по `tag` (по умолчанию `div`) и
 * строка внутри — `Button` на `span`, как у Vue.
 *
 * Наборы ядра стоят на двух элементах. Корень несёт `dataset`, `attrs` и место
 * в коллекции (`order`): опции стоят флексом по месту в составе. Строка несёт
 * `aria` — вся ARIA опции на элементе, который и есть опция: `role="option"`
 * от ядра, `id` и `aria-selected` от коллекции, — и тот же `dataset`: фон при
 * подсветке и выборе тема рисует на самой кнопке и читает `data-highlighted`
 * и `data-selected` с неё. Набор опции ложится поверх того, что `Button`
 * пишет себе сам: `role="option"` перекрывает `role="button"`, а
 * `tabindex="-1"` выводит строку из обхода — фокус остаётся на поле. Атрибуты
 * потребителя делятся, как у Vue: класс и стиль — корню, остальное — строке,
 * поверх её наборов.
 *
 * Тег строки фиксирован (`span`), а не берётся из `tag` опции: `tag` — тег
 * корня, под фиксированный тег строки написан `TSelectItem._ariaTag`. Вида у
 * строки нет: значения вида объявляет тема, строку опции она красит по
 * контексту (`.so-select-item`).
 *
 * Выбор — клик по корню, как `@click` корня у Vue: выбирает через Select
 * (`adapters.select.choose()`), а выключенной опции отказывает он сам. Клик
 * потребителя стоит на строке и приходит раньше, всплытием.
 *
 * Обёртка отметки рисуется, пока `indicator` не `none`, — и у невыбранных
 * тоже: она резервирует место, и строка не прыгает при выборе. Иконка внутри
 * — только у выбранной, слот `indicator-icon` подменяет её. `aria-hidden`:
 * состояние скринридеру объявляет `aria-selected`.
 *
 * По слотам `default` и `indicator-icon` разметка выбирает, что рисовать,
 * поэтому их разворачивает адаптер, один раз (`resolveSlot`): пустое, что
 * вернул проброс Select, уступает место своему — тексту и иконке.
 */
export function SelectItem(props: SelectItemProps): JSX.Element {
	const binding = setupSelectItem(props)
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

	/** Атрибуты строки — всё от потребителя, кроме класса и стиля. */
	const row = () => toControlAttrs<SelectItemAttributes>(binding.forwardProps())

	function choose(): void {
		context?.adapters.select.choose()
	}

	const mark = () => (
		<span class="so-select-item__indicator" aria-hidden="true">
			{indicatorIcon() ??
				(state.selected ? (
					<Icon embedded="select.indicator" tag={CHECK} size={state.size} />
				) : null)}
		</span>
	)

	return (
		<Show when={state.rendered}>
			<Dynamic {...root()} component={rootTag(state.tag)} ref={binding.ref} onClick={choose}>
				<Button
					embedded="select.row"
					tag="span"
					tabindex={-1}
					size={state.size}
					variant={state.variant}
					disabled={state.disabled}
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
