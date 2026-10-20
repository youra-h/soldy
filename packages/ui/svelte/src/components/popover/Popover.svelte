<script lang="ts">
	import { Dynamic, roleIcon, toRootProps } from '../../adapter'
	import { Button } from '../button'
	import { Frame } from '../frame'
	import { Icon } from '../icon'
	import { setupPopover } from './setup.component'
	import type { PopoverProps } from './base.component'

	let { ref = $bindable(), ...props }: PopoverProps = $props()
	const mountId = $props.id()

	const binding = setupPopover(() => props, mountId, (node) => (ref = node))
	const state = binding.state
	const ctrl = binding.ctrl

	// Глиф крестика без слота — метка роли: `tag` у Icon — корень, а не роль
	const CLOSE = roleIcon('close')

	/** Крестик только закрывает поповер: куда вернуть фокус, решает плагин фокуса. */
	function close(): void {
		ctrl.open = false
	}
</script>

<!--
	Popover — панель с произвольным содержимым у триггера, как у Vue.

	Корень — обёртка триггера и якорь панели. Рисуется по `tag`, по умолчанию
	`span`: Popover встаёт и в строку текста, и в ряд тегов, а внутри строчного
	элемента HTML разрешает только строчную разметку. Панель телепортирована,
	поэтому в корне лежит только триггер, и прямоугольник корня совпадает с его
	прямоугольником. На корне — `attrs` и `dataset` (`data-open` — для темы и
	для потребителя, который красит свой триггер по контексту) и атрибуты
	потребителя. ARIA на корне нет: она у панели и у триггера.

	Триггер — сниппет `trigger` внутри корня, поэтому нажатие по открытому
	триггеру — нажатие внутри владельца, и панель не мигает. Своего экземпляра у
	содержимого сниппета нет, поэтому сторону связки (`aria-haspopup`,
	`aria-expanded`, `aria-controls`) и вид «нажат» (`data-selected`) он
	получает в scope — двумя наборами, ARIA и `data-*` врозь.

	Панель — Frame: телепорт, слой, привязка к корню (`anchor_anchor` — корень
	из `rootElement` адаптера), пометка владельцем. На неё ложится `aria`
	поповера: `role="dialog"`, `id`, на который ссылается `aria-controls`
	триггера, и имя от `TAriaPlugin`; `tabindex="-1"` — фокус встаёт на саму
	панель, когда внутри нечего фокусировать; `panelDataset` — признак «тянут»
	(`data-swiping`) и край панели в контейнере (`data-edge`). Открытость — это
	`visible` панели, а не `rendered`: закрытие её прячет, а не размонтирует.
	`data-open` панели Frame пишет сам — это видимость его слоя. `contained`
	оставляет панель в корне, без телепорта: она прижата к краю ближайшего
	позиционированного предка, и якорь её не двигает.

	В панели — полоса жеста (пока жест включён; немая для скринридера), затем
	содержимое (`lazyMount` прячет только сниппет — обёртка остаётся), затем
	крестик: содержимое в DOM раньше, и фокус при открытии встаёт на первый его
	контрол, а крестик — последняя остановка Tab. Вида и размера у крестика нет:
	квадрат и цвет даёт тема по контексту. Иконка — сниппет `close-icon`, без
	него — роль `close`.

	Триггер и панель стоят вплотную: пробел между ними Svelte оставил бы в
	корне текстом.
-->
{#if state.rendered}
	<Dynamic
		tag={state.tag}
		attributes={toRootProps(state, [state.attrs, state.dataset], binding.forwardProps)}
		attach={binding.attachElement}
	>
		{@render props.trigger?.({
			triggerAria: state.triggerAria ?? {},
			triggerDataset: state.triggerDataset ?? {},
		})}<Frame
			embedded="popover.frame"
			class="so-popover__panel"
			tabindex={-1}
			visible={state.open}
			contained={state.contained}
			position="fixed"
			anchor_anchor={binding.rootElement}
			anchor_placement={state.placement}
			anchor_offset={8}
			{...state.aria}
			{...state.panelDataset}
			{...state.dismiss_ownerAttribute}
		>
			{#if state.handleRendered}
				<div class="so-popover__handle" aria-hidden="true"></div>
			{/if}
			<div class="so-popover__content">
				{#if state.contentRendered}{@render props.children?.()}{/if}
			</div>
			<Button
				embedded="popover.close"
				type="button"
				class="so-popover__close"
				rendered={state.closable}
				onclick={close}
				{...state.closeAria}
			>
				{#if props['close-icon']}
					{@render props['close-icon']()}
				{:else}
					<Icon embedded="popover.close-icon" tag={CLOSE} />
				{/if}
			</Button>
		</Frame>
	</Dynamic>
{/if}
