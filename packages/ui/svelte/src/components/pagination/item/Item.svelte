<script lang="ts">
	import { Dynamic, toRootProps } from '../../../adapter'
	import { Button } from '../../button'
	import { setupPaginationItem } from './setup.component'
	import type { PaginationItemProps } from './base.component'

	let { ref = $bindable(), ...props }: PaginationItemProps = $props()
	const mountId = $props.id()

	const binding = setupPaginationItem(() => props, mountId, (node) => (ref = node))
	const state = binding.state
	const context = binding.context

	/**
	 * Нажатие делает страницу текущей — активацией коллекции, как у таба;
	 * значение пагинации за ней пишет расширение коллекции. Нажатие по текущей
	 * ничего не меняет.
	 */
	function activate(): void {
		if (context) context.adapters.activation.active = true
	}
</script>

<!--
	PaginationItem — страница, внутренняя часть Pagination, как тост у Toasts:
	её рисует только владелец, по одной на каждую страницу окна, потребитель её
	в разметку не ставит, и из пакета она не выходит.

	Корень — место страницы в списке, рисуется по `tag` (по умолчанию `li`). На
	нём набор `dataset`: `data-selected` (текущая — пишет активация коллекции,
	как у таба) и `data-disabled`. Атрибуты снаружи ложатся на корень: ставит
	страницу только владелец, и своих атрибутов у него для неё нет.

	Строка — Button с номером или текстом страницы (слот `default` со scope
	`{ text }`, запасное — `text` страницы). На ней `size` и `variant` страницы
	(их диктует пагинация, как табам набор), `disabled` и набор `aria`:
	`aria-current="page"` у текущей, его пишет расширение коллекции. Текущая —
	обычная, не выключенная кнопка: каждая страница — своя остановка Tab. Вида
	нет: `plain`, у текущей — заливку, и квадрат узкого номера даёт тема по
	контексту.
-->
{#if state.rendered}
	<Dynamic
		tag={state.tag}
		attributes={toRootProps(state, [state.attrs, state.dataset], binding.forwardProps)}
		attach={binding.attachElement}
	>
		<Button
			embedded="pagination.page"
			type="button"
			disabled={state.disabled}
			size={state.size}
			variant={state.variant}
			onclick={activate}
			{...state.aria}
		>
			{#if props.children}
				{@render props.children({ text: state.text ?? '' })}
			{:else}
				{state.text}
			{/if}
		</Button>
	</Dynamic>
{/if}
