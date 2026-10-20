<script lang="ts">
	import type { TAttributesMap } from '@soldy-ui/core'
	import { Dynamic, Teleport, roleIcon, toRootProps, toShownStyleText } from '../../adapter'
	import { Button } from '../button'
	import { Icon } from '../icon'
	import { setupDrawer } from './setup.component'
	import type { DrawerProps } from './base.component'

	let { ref = $bindable(), ...props }: DrawerProps = $props()
	const mountId = $props.id()

	const binding = setupDrawer(() => props, mountId, (node) => (ref = node))
	const state = binding.state
	const ctrl = binding.ctrl

	/**
	 * Статический набор панели — первым, под наборами ядра: `tabindex="-1"` —
	 * фокус встаёт на саму панель, когда внутри нечего фокусировать.
	 */
	const PANEL: TAttributesMap = { tabindex: '-1' }

	// Глиф крестика без сниппета — метка роли
	const CLOSE = roleIcon('close')
</script>

<!--
	Drawer — выезжающая панель у края экрана, как у Vue. Анатомия — как у
	модального окна: подложка и панель — соседи, а не обёртка и содержимое.
	Подложка стоит в DOM раньше панели: слой у них один (одно число `z-index`
	инлайном), и панель рисуется поверх просто порядком. Нажатие по подложке для
	плагинов слоя — нажатие мимо корня.

	Обе уходят телепортом в цель слоя (`target`, по умолчанию `body`), а
	`contained` телепорт выключает: панель и подложка остаются на месте, в
	разметке родителя, — и на сервере тоже, — и тема ставит их в ближайший
	позиционированный предок. Цели телепорта тогда нет — `target` не действует.

	Номер слоя, открытость и место у подложки те же, что у панели
	(`backdropDataset`, `z-index` из `layout_backdropStyles`): она гаснет вместе
	с панелью (`toShownStyleText` — `display: none` поверх стиля, как `v-show`)
	и внутри контейнера накрывает только его. Пометки владельцем у неё нет — для
	своей панели она мимо.

	Корень — сама панель: на ней слой (`data-layer`), пометка владельцем, край
	(`so-drawer--placement-*`), размер переменными (`layout_styles`),
	`data-open`, `data-swiping` и `data-contained`, атрибуты потребителя —
	поверх наборов. Сдвиг во время жеста (`--so-swipe-offset`) плагин жеста
	пишет в неё сам: стиль корня на узле ставится по свойствам и его не стирает.
	Открытость — `visible`: закрытая панель спрятана, а не размонтирована.
	`ref` — панель: её пишет attachment корня.

	Порядок в DOM — полоса жеста (пока жест включён; немая для скринридера),
	заголовок, тело, подвал, потом крестик: фокус при открытии попадает на
	первый контрол содержимого, а крестик — последняя остановка Tab. Заголовок
	рисуется всегда — на него панель ссылается `aria-labelledby` (`titleAria`).
	Вокруг сниппетов пробелов нет: пустой заголовок и подвал тема сворачивает по
	`:empty`. Крестик просит панель закрыться (`requestClose('button')`) и
	прячется `rendered`: тема опирается на его отсутствие в DOM.

	Подложка и панель стоят вплотную: пробел между ними Svelte оставил бы в
	цели или в разметке родителя текстом.
-->
{#if state.rendered}
	<Teleport to={state.target} disabled={state.contained}>
		<div
			class="so-drawer__backdrop"
			style={toShownStyleText(state.layout_backdropStyles, state.visible === true)}
			{...state.backdropDataset}
		></div><Dynamic
			tag={state.tag}
			attributes={toRootProps(
				state,
				[PANEL, state.attrs, state.aria, state.dataset, state.dismiss_ownerAttribute],
				binding.forwardProps,
			)}
			attach={binding.attachElement}
		>
			{#if state.handleRendered}
				<div class="so-drawer__handle" aria-hidden="true"></div>
			{/if}
			<h2 class="so-drawer__title" {...state.titleAria}>{@render props.title?.()}</h2>
			<div class="so-drawer__body">{@render props.children?.()}</div>
			<div class="so-drawer__footer">{@render props.footer?.()}</div>
			<Button
				embedded="drawer.close"
				type="button"
				class="so-drawer__close"
				rendered={state.closable}
				onclick={() => ctrl.requestClose('button')}
				{...state.closeAria}
			>
				{#if props['close-icon']}
					{@render props['close-icon']()}
				{:else}
					<Icon embedded="drawer.close-icon" tag={CLOSE} />
				{/if}
			</Button>
		</Dynamic>
	</Teleport>
{/if}
