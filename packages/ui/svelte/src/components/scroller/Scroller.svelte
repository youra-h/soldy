<script lang="ts">
	import { Dynamic, roleIcon, toRootProps } from '../../adapter'
	import { Button } from '../button'
	import { Icon } from '../icon'
	import { setupScroller } from './setup.component'
	import type { ScrollerProps } from './base.component'

	let { ref = $bindable(), ...props }: ScrollerProps = $props()
	const mountId = $props.id()

	const binding = setupScroller(() => props, mountId, (node) => (ref = node))
	const state = binding.state

	// Одна иконка на обе кнопки: роли «влево» в контракте иконок нет, и ту
	// стрелку, что смотрит в начало строки, зеркалит тема. Метка одна на роль
	const ARROW = roleIcon('arrowRight')
</script>

<!--
	Scroller — лента произвольного содержимого в одну строку, которую двигают
	две кнопки. Корень — ряд из трёх мест: кнопка «назад», вьюпорт, кнопка
	«вперёд».

	Кнопки стоят СНАРУЖИ вьюпорта намеренно: роль ряда у первого потребителя
	(`role="listbox"` у тегов) приходит на вьюпорт, а листбокс владеет только
	опциями — кнопке внутри него места нет.

	Обработчиков нажатия здесь нет: клики ловит плагин слушателем на корне и
	зовёт команды ядра. Связка «нажали ⇄ листаем» иначе повторилась бы в каждом
	из шести адаптеров.

	`data-can-prev` и `data-can-next` приезжают в `dataset` — по ним тема гасит
	подсказку у края и снимает обе кнопки, когда листать нечего. `dir` приходит
	в `attrs` сам.

	Кнопки вида разметкой не получают: значения вида объявляет тема, и красит
	она кнопку по контексту (`:where(.so-scroller__prev)`). Выключенность
	считает ядро — «выключена лента или упёрлись в край»: тема корень не гасит,
	и `disabled` обязан доехать до кнопок разметкой. Имена — от локали, в
	наборах `prevAria` и `nextAria`. Значок — иконка роли `arrowRight` у обеих
	кнопок; слоты `prev-icon` и `next-icon` его заменяют.

	Вьюпорт — он же ряд: обёртки-дорожки между ним и содержимым нет. Это один
	узел с тремя обязанностями — прокручиваемый контейнер, строка содержимого и
	носитель роли от потребителя. `viewportAria` идёт ПОСЛЕ `tabindex`:
	значение потребителя сильнее нашего — ряд с roving tabindex сам решает,
	кому быть остановкой. Остановка Tab — набором, как у узла списка ListBox:
	роль вьюпорту даёт набор потребителя, а без неё прокручиваемый ряд — всё
	равно остановка, иначе клавиатурой его не пролистать; компилятор Svelte
	роли в наборе не видит и счёл бы остановку на `div` ошибкой доступности.
	Содержимое — слот по умолчанию (`children`), его элементы становятся
	прямыми детьми вьюпорта: по ним тема расставляет точки снапа, а плагин
	считает края.
-->
{#if state.rendered}
	<Dynamic
		tag={state.tag}
		attributes={toRootProps(
			state,
			[state.attrs, state.aria, state.dataset],
			binding.forwardProps,
		)}
		attach={binding.attachElement}
	>
		<Button
			embedded="scroller.prev"
			type="button"
			class="so-scroller__prev"
			size={state.size}
			disabled={state.prevDisabled}
			{...state.prevAria}
		>
			{#if props['prev-icon']}
				{@render props['prev-icon']()}
			{:else}
				<Icon embedded="scroller.prev-icon" tag={ARROW} size={state.size} />
			{/if}
		</Button>
		<div
			class="so-scroller__viewport"
			{...{ tabindex: state.viewportTabIndex }}
			{...state.viewportAria}
		>
			{@render props.children?.()}
		</div>
		<Button
			embedded="scroller.next"
			type="button"
			class="so-scroller__next"
			size={state.size}
			disabled={state.nextDisabled}
			{...state.nextAria}
		>
			{#if props['next-icon']}
				{@render props['next-icon']()}
			{:else}
				<Icon embedded="scroller.next-icon" tag={ARROW} size={state.size} />
			{/if}
		</Button>
	</Dynamic>
{/if}
