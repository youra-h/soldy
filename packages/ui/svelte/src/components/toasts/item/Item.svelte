<script lang="ts">
	import type { TToastsItemType } from '@soldy-ui/core'
	import { Dynamic, isToastRender, roleIcon, toRootProps, type TRoleIcon } from '../../../adapter'
	import { Button } from '../../button'
	import { Icon } from '../../icon'
	import { ProgressSpinner } from '../../progress-spinner'
	import { setupToastsItem } from './setup.component'
	import type { ToastsItemProps } from './base.component'

	let { ref = $bindable(), ...props }: ToastsItemProps = $props()
	const mountId = $props.id()

	const binding = setupToastsItem(() => props, mountId, (node) => (ref = node))
	const state = binding.state
	const ctrl = binding.ctrl

	/**
	 * Значок вида — по роли, своей у каждого вида: в режиме принудительных цветов
	 * вид различает только глиф. Роль выбирает разметка, как отметку CheckBox,
	 * тема значок только красит. Таблица закрыта по виду (`satisfies`): новый вид
	 * без своего значка не соберётся.
	 */
	const TYPE_ICONS = {
		info: roleIcon('info'),
		success: roleIcon('success'),
		warning: roleIcon('warning'),
		error: roleIcon('error'),
	} satisfies Record<TToastsItemType, TRoleIcon>

	/** Значок обычного сообщения — тоста без вида. */
	const NOTIFICATION = roleIcon('notification')

	// Глиф крестика без сниппета — метка роли
	const CLOSE = roleIcon('close')
</script>

<!--
	ToastsItem — тост, внутренняя часть менеджера, как у Vue: его рисует только
	регион `Toasts`, по одному на показанный элемент коллекции, и наружу пакета
	он не выходит.

	Корень — место тоста в списке (по `tag`, по умолчанию `li`): высота места,
	сдвиг жеста, уход и прозрачность (тема). На нём: вид сообщения —
	модификатор `so-toasts-item--type-*`, `data-open` (с первой отрисовки;
	`false` — тост закрыт и гаснет), `data-swiping`, роль `status` или `alert`
	для срочного, `tabindex` — фокус по F8 и Escape на тосте под фокусом.
	Сдвиг во время жеста (`--so-swipe-offset`) плагин жеста пишет сюда сам.
	Глубина в стопке (`--so-toasts-depth`) — место тоста в составе, `order`
	фасада: в стопке передний — первый. Своего CSS-свойства `order` у тоста нет,
	как у Vue: порядок узлов в регионе и есть порядок коллекции, — поэтому
	состояние раскладке корня отдаётся поимённо, без `order`.

	Плашка — то, что видно: поверхность, кромка, тень и кольцо фокуса корня.
	Отдельный узел, а не корень: место растёт и схлопывается переходом высоты
	без замеров, а плашка своего размера не меняет.

	Коробка значка стоит всегда, и в ней одно из трёх: пока тост ждёт
	(`loading`) — бегущее кольцо, при любом виде и что бы ни было в сниппете;
	задан сниппет `icon` (scope — вид) — свой значок; иначе — значок вида по
	роли. Коробка — декор: что случилось, говорит текст, поэтому она спрятана
	от скринридера вместе с ролью кольца.

	Текст — заголовок (сниппет `children` со scope `{ text }`, запасное — `text`
	тоста), описание (`description`) и своё содержимое (сниппет `content`,
	запасное — `render` тоста: компонент Svelte, тост приходит ему пропом
	`toast`). Вокруг частей пробелов нет: пустую часть тема сворачивает по
	`:empty`.

	Крестик — последним в DOM: последняя остановка Tab в тосте. Прячется
	`rendered` (`closable`), имя — из локали вместе с текстом тоста
	(`closeAria`). Вида и размера у него нет: квадрат и вид даёт тема по
	контексту.
-->
{#if state.rendered}
	<Dynamic
		tag={state.tag}
		attributes={toRootProps(
			{ classes: state.classes, visible: state.visible },
			[state.attrs, state.aria, state.dataset],
			binding.forwardProps,
			{ '--so-toasts-depth': state.order ?? '' },
		)}
		attach={binding.attachElement}
	>
		<div class="so-toasts-item__card">
			<span class="so-toasts-item__icon" aria-hidden="true">
				{#if state.loading}
					<ProgressSpinner embedded="toasts.spinner" indeterminate />
				{:else if props.icon}
					{@render props.icon({ type: state.type })}
				{:else}
					<Icon
						embedded="toasts.icon"
						tag={state.type ? TYPE_ICONS[state.type] : NOTIFICATION}
					/>
				{/if}
			</span>
			<div class="so-toasts-item__body">
				<div class="so-toasts-item__text">
					{#if props.children}
						{@render props.children({ text: state.text ?? '' })}
					{:else}
						{state.text}
					{/if}
				</div>
				<div class="so-toasts-item__description">{state.description}</div>
				<div class="so-toasts-item__content">
					{#if props.content}
						{@render props.content()}
					{:else if isToastRender(state.render)}
						{@const Render = state.render}
						<Render toast={ctrl} />
					{/if}
				</div>
			</div>
			<Button
				embedded="toasts.close"
				type="button"
				class="so-toasts-item__close"
				rendered={state.closable}
				onclick={() => ctrl.close()}
				{...state.closeAria}
			>
				{#if props['close-icon']}
					{@render props['close-icon']()}
				{:else}
					<Icon embedded="toasts.close-icon" tag={CLOSE} />
				{/if}
			</Button>
		</div>
	</Dynamic>
{/if}
