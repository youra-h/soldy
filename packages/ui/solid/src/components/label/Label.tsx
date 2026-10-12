import { Show, type JSX } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import { createRootProps, renderSlot, resolveSlot, rootTag } from '../../adapter'
import { setupLabel } from './setup.component'
import type { LabelProps } from './base.component'

/**
 * Label — подпись контрола. Корень рисуется по `tag`, по умолчанию `label`;
 * модификаторы стороны, размера и варианта — на корне, тема читает всё отсюда.
 *
 * Связки через `for` и `id` нет: контрол — первый labelable-потомок `label`,
 * поэтому клик по тексту переключает его, а текст становится его доступным
 * именем. Внутри — только `span`: `div` и вложенный `label` HTML здесь
 * запрещает, а описание или ошибка вошли бы в имя.
 *
 * Порядок в DOM один на все стороны: контрол, потом текст. Сторону рисует тема.
 *
 * - контрол — `children` (слот `default`): CheckBox, Switch или
 *   RadioGroup.Item с `tag="span"` — корень радио сам `label`, а `label` в
 *   `label` запрещён, забытый тег ловит плагин подписи. Обёртка выравнивает
 *   контрол по первой строке текста;
 * - текст — слот `content`, без него — проп `text`. Разметка выбирает по
 *   слоту, поэтому его разворачивает адаптер, один раз (`resolveSlot`). Пустую
 *   обёртку тема прячет по `:empty`, поэтому пустой текст не рисуется вовсе:
 *   Solid оставил бы от снятого текста пустой текстовый узел. Пробелов вокруг
 *   частей нет — JSX их не ставит.
 */
export function Label(props: LabelProps): JSX.Element {
	const binding = setupLabel(props)
	const state = binding.state
	// Наборы ядра, поверх — атрибуты снаружи, `ref` адаптера последним
	const root = createRootProps(() => ({
		state,
		sets: [state.attrs, state.aria, state.dataset],
		forward: binding.forwardProps(),
	}))
	const content = resolveSlot(
		() => props.content,
		() => ({}),
	)

	return (
		<Show when={state.rendered}>
			<Dynamic {...root()} component={rootTag(state.tag)} ref={binding.ref}>
				<span class="s-label__control">{renderSlot(props.children)}</span>
				<span class="s-label__text">{content() ?? (state.text || undefined)}</span>
			</Dynamic>
		</Show>
	)
}
