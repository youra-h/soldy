<script lang="ts">
	import type { TAttributesMap } from '@soldy-ui/core'
	import { Dynamic, Teleport, roleIcon, toRootProps, toShownStyleText } from '../../adapter'
	import { Button } from '../button'
	import { Icon } from '../icon'
	import { setupDialog } from './setup.component'
	import type { DialogProps } from './base.component'

	let { ref = $bindable(), ...props }: DialogProps = $props()
	const mountId = $props.id()

	const binding = setupDialog(() => props, mountId, (node) => (ref = node))
	const state = binding.state
	const ctrl = binding.ctrl

	/**
	 * Статический набор панели — первым, под наборами ядра: `tabindex="-1"` —
	 * фокус встаёт на саму панель, когда внутри нечего фокусировать.
	 */
	const PANEL: TAttributesMap = { tabindex: '-1' }

	// Глифы кнопок шапки без сниппетов — метки ролей
	const CLOSE = roleIcon('close')
	const MAXIMIZE = roleIcon('arrowsOutward')
	const RESTORE = roleIcon('arrowsInward')
</script>

<!--
	Dialog — модальное окно, как у Vue: телепортировано целиком, в цель слоя
	(`target`, по умолчанию `body`). Подложка и панель — соседи, а не обёртка и
	содержимое. Подложка стоит в DOM раньше панели: слой у них один (одно число
	`z-index` инлайном), и панель рисуется поверх просто порядком. На сервере
	телепорта нет — окно появляется после гидратации.

	Подложка обязательна и закрывает весь экран: фон под окном скрыт от
	скринридера, но не от указателя, и к странице его не пускает только она.
	Номер слоя у неё тот же, что у окна (`backdropDataset`, `z-index` из
	`layout_backdropStyles`): для окна под этим она — слой выше. Открытость —
	тоже: подложка гаснет вместе с окном (`toShownStyleText` — `display: none`
	поверх стиля, как `v-show`). Пометки владельцем у неё нет — для своего окна
	она мимо.

	Корень — сама панель: на ней слой (`data-layer`), пометка владельцем,
	место (`so-dialog--placement-*`), размер переменными (`layout_styles`),
	`data-open` и `data-maximized`, атрибуты потребителя — поверх наборов.
	Открытость — `visible`: закрытое окно спрятано, а не размонтировано, и
	состояние содержимого переживает закрытие. `ref` — панель: её пишет
	attachment корня, и в цели телепорта тоже.

	Порядок в DOM — заголовок, тело, подвал, потом кнопки: фокус при открытии
	попадает на первый контрол содержимого, а крестик — последняя остановка
	Tab. В строку заголовка кнопки переносит тема, областями сетки. Заголовок
	рисуется всегда — на него окно ссылается `aria-labelledby` (`titleAria`),
	тело несёт `id` для `aria-describedby` предупреждения (`bodyAria`). Вокруг
	сниппетов пробелов нет: пустой заголовок и подвал тема сворачивает по
	`:empty`.

	Кнопка разворота — переключатель: имя одно, состояние в `aria-pressed`
	(`maximizeAria`); иконок две, видна одна — по `maximized`. Крестик просит
	окно закрыться (`requestClose('button')`): отменить закрытие может
	подписчик `close:before`. Кнопки шапки прячутся `rendered`, а не `visible`:
	тема опирается на их отсутствие в DOM. Вида и размера у них нет — их красит
	тема по контексту.

	Подложка и панель стоят вплотную: пробел между ними Svelte оставил бы в
	цели текстом.
-->
{#if state.rendered}
	<Teleport to={state.target}>
		<div
			class="so-dialog__backdrop"
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
			<h2 class="so-dialog__title" {...state.titleAria}>{@render props.title?.()}</h2>
			<div class="so-dialog__body" {...state.bodyAria}>{@render props.children?.()}</div>
			<div class="so-dialog__footer">{@render props.footer?.()}</div>
			<Button
				embedded="dialog.maximize"
				type="button"
				class="so-dialog__maximize"
				rendered={state.maximizable}
				onclick={() => ctrl.toggleMaximized()}
				{...state.maximizeAria}
			>
				{#if state.maximized}
					{#if props['restore-icon']}
						{@render props['restore-icon']()}
					{:else}
						<Icon embedded="dialog.restore-icon" tag={RESTORE} />
					{/if}
				{:else if props['maximize-icon']}
					{@render props['maximize-icon']()}
				{:else}
					<Icon embedded="dialog.maximize-icon" tag={MAXIMIZE} />
				{/if}
			</Button>
			<Button
				embedded="dialog.close"
				type="button"
				class="so-dialog__close"
				rendered={state.closable}
				onclick={() => ctrl.requestClose('button')}
				{...state.closeAria}
			>
				{#if props['close-icon']}
					{@render props['close-icon']()}
				{:else}
					<Icon embedded="dialog.close-icon" tag={CLOSE} />
				{/if}
			</Button>
		</Dynamic>
	</Teleport>
{/if}
