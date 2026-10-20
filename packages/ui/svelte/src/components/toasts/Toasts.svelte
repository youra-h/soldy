<script lang="ts">
	import type { TToastsItemType } from '@soldy-ui/core'
	import { Dynamic, Teleport, toRootProps } from '../../adapter'
	import { ToastsItem } from './item'
	import { setupToasts } from './setup.component'
	import type { ToastsProps } from './base.component'

	let { ref = $bindable(), ...props }: ToastsProps = $props()
	const mountId = $props.id()

	const binding = setupToasts(() => props, mountId, (node) => (ref = node))
	const state = binding.state
</script>

<!--
	Toasts — менеджер уведомлений и их регион, как у Vue.

	Менеджер оборачивает приложение, как `LocaleProvider`: `children` — само
	приложение, своей разметки вокруг него нет. Потомок берёт API тостов
	(`useToasts()`) у лифта менеджера. Регион с тостами — следом, телепортом в
	цель слоя (`target`): тосты в нём — отдельный корень Svelte с контекстами
	места, и лифт коллекции до них доходит. Приложение стоит вне условия
	региона: оно рисуется и без региона. На сервере телепорта нет — регион
	появляется после гидратации.

	Регион стоит всегда, и пустым: живая область должна быть в документе до
	первого тоста. Места он не занимает и нажатий мимо тостов не ловит — это
	тема. На нём: место — модификатор `so-toasts--placement-*` и раскладка —
	`so-toasts--layout-*`, номер слоя — `z-index` (`layout_styles`) и
	`data-layer`, `role="region"`, `aria-live` и имя из локали, `dir`. Атрибуты
	потребителя — поверх наборов, `ref` — регион: его пишет attachment корня.

	Тост — по одному на каждый показанный (`shown`), новый — первым. Закрытый
	тост остаётся, пока гаснет, и уходит из коллекции, когда доиграли переходы
	его корня. Петля — по ключу тоста (`uid`).

	Слоты тоста пробрасываются целиком: `item-<слот>` (`default` — `item`),
	scope — scope слота тоста плюс сам тост. Проброс — сниппет, который тост
	зовёт со своим scope, и отдаётся он тосту, только когда слот задан
	менеджеру: сниппет непрозрачен, и без `item-icon` тост рисует значок вида,
	без `item` — текст, без `item-content` — `render`, без `item-close-icon` —
	иконку крестика.

	Приложение и регион стоят вплотную: пробел между ними Svelte оставил бы в
	разметке родителя текстом.
-->
{@render props.children?.()}{#if state.rendered}
	<Teleport to={state.target}>
		<Dynamic
			tag={state.tag}
			attributes={toRootProps(
				state,
				[state.attrs, state.aria, state.dataset],
				binding.forwardProps,
			)}
			attach={binding.attachElement}
		>
			<ol class="so-toasts__list">
				{#each state.shown ?? [] as item (item.uid)}
					{#snippet icon(scope: { type: TToastsItemType | undefined })}
						{@render props['item-icon']?.({ ...scope, item })}
					{/snippet}
					{#snippet text(scope: { text: string })}
						{@render props.item?.({ ...scope, item })}
					{/snippet}
					{#snippet content()}
						{@render props['item-content']?.({ item })}
					{/snippet}
					{#snippet closeIcon()}
						{@render props['item-close-icon']?.({ item })}
					{/snippet}
					<ToastsItem
						ctrl={item}
						icon={props['item-icon'] ? icon : undefined}
						content={props['item-content'] ? content : undefined}
						close-icon={props['item-close-icon'] ? closeIcon : undefined}
						children={props.item ? text : undefined}
					/>
				{/each}
			</ol>
		</Dynamic>
	</Teleport>
{/if}
