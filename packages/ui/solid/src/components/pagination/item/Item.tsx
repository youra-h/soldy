import type { JSX } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import { createRootProps, resolveSlot, rootTag } from '../../../adapter'
import { Show } from '../../../adapter/runtime/flow'
import { Button } from '../../button'
import { setupPaginationItem } from './setup.component'
import type { PaginationItemProps } from './base.component'

/**
 * PaginationItem — страница, внутренняя часть Pagination, как тост у Toasts:
 * её рисует только владелец, по одной на каждую страницу окна, потребитель её
 * в разметку не ставит, и из пакета она не выходит.
 *
 * Корень — место страницы в списке, рисуется по `tag` (по умолчанию `li`). На
 * нём набор `dataset`: `data-selected` (текущая — пишет активация коллекции,
 * как у таба) и `data-disabled`. Атрибуты снаружи ложатся на корень: ставит
 * страницу только владелец, и своих атрибутов у него для неё нет.
 *
 * Строка — Button с номером или текстом страницы (слот `children` со scope
 * `{ text }`, запасное — `text` страницы). На ней `size` и `variant` страницы
 * (их диктует пагинация, как табам набор), `disabled` и набор `aria`:
 * `aria-current="page"` у текущей, его пишет расширение коллекции. Текущая —
 * обычная, не выключенная кнопка: каждая страница — своя остановка Tab. Вида
 * нет: `plain`, у текущей — заливку, и квадрат узкого номера даёт тема по
 * контексту. По слоту разметка выбирает, что рисовать, поэтому его
 * разворачивает адаптер, один раз (`resolveSlot`): пустое, что вернул проброс
 * пагинации, уступает место тексту.
 *
 * Нажатие делает страницу текущей — активацией коллекции, как у таба;
 * значение пагинации за ней пишет расширение коллекции. Нажатие по текущей
 * ничего не меняет.
 */
export function PaginationItem(props: PaginationItemProps): JSX.Element {
	const binding = setupPaginationItem(props)
	const state = binding.state
	const context = binding.context
	// Наборы ядра, поверх — атрибуты снаружи, `ref` адаптера последним
	const root = createRootProps(() => ({
		state,
		sets: [state.attrs, state.dataset],
		forward: binding.forwardProps(),
	}))
	const content = resolveSlot(
		() => props.children,
		() => ({ text: state.text ?? '' }),
	)

	function activate(): void {
		if (context) context.adapters.activation.active = true
	}

	return (
		<Show when={state.rendered}>
			<Dynamic {...root()} component={rootTag(state.tag)} ref={binding.ref}>
				<Button
					embedded="pagination.page"
					type="button"
					disabled={state.disabled}
					size={state.size}
					variant={state.variant}
					{...state.aria}
					onClick={activate}
				>
					{content() ?? state.text}
				</Button>
			</Dynamic>
		</Show>
	)
}
