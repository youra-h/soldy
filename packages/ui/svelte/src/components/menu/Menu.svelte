<script lang="ts">
	import { Dynamic, toRootProps } from '../../adapter'
	import { Frame } from '../frame'
	import { drawItems } from './submenu/Submenu.svelte'
	import { setupMenu } from './setup.component'
	import type { MenuProps } from './base.component'

	let { ref = $bindable(), ...props }: MenuProps = $props()
	const mountId = $props.id()

	const binding = setupMenu(() => props, mountId, (node) => (ref = node))
	const state = binding.state
</script>

<!--
	Menu — меню действий у кнопки (APG Menu Button) или контекстное меню
	области, как у Vue.

	Корень — обёртка триггера и якорь панели, как у Popover. Рисуется по `tag`,
	по умолчанию `span`: меню встаёт и в строку текста, и в ряд кнопок. Панель
	телепортирована, поэтому в корне лежит только триггер, и прямоугольник
	корня — прямоугольник триггера. На корне — `attrs` и `dataset` (`data-open`
	— для потребителя, который красит свой триггер по контексту), поверх — все
	атрибуты потребителя. ARIA на корне нет: она у панели и у триггера. `ref` —
	корень.

	Триггер — кнопка потребителя («…», «Действия») в сниппете `trigger`. Лежит
	внутри корня: нажатие по открытому триггеру — нажатие внутри владельца, и
	панель не мигает. Своего экземпляра у содержимого сниппета нет, поэтому
	сторону связки (`aria-haspopup`, `aria-expanded`, `id`, `aria-controls`) и
	вид «нажата» (`data-selected`) он получает в scope — двумя наборами, ARIA и
	`data-*` врозь. Scope Svelte отдаёт сниппету геттером: связка меняется на
	каждое открытие, а триггер остаётся тем же узлом — на нём фокус, и на него
	же его возвращает закрытие. У контекстного меню (`openOn: 'contextmenu'`) в
	сниппете — область: строка, файл, картинка, — и связка у неё пуста.

	Панель — Frame: телепорт, слой, привязка к корню (`anchor_anchor` — корень
	из `rootElement` связки меню, отступ 4px, как у Select) и пометка владельцем
	(`dismiss_ownerAttribute`) для закрытия по нажатию мимо. На неё ложится
	`aria` меню: `role="menu"`, `id`, на который ссылается `aria-controls`
	триггера, и `aria-labelledby` на триггер — имя меню. `tabindex="-1"` —
	фокус встаёт на саму панель, пока ни один пункт не подсвечен. У
	контекстного меню панель встаёт у точки вызова (`point`): точка главнее
	корня, пока задана, и выбирает между ними якорь, а не разметка.

	Открытость — `visible` панели, а не `rendered`: пункты входят в коллекцию
	при монтировании, и закрытие не должно её вычищать. Классы панели — свой
	набор меню (`panelClasses`): блок `so-menu__panel` с размером и вариантом
	меню — модификаторы корня до телепортированной панели не доходят.

	Список (`so-menu__list`) — то, что прокручивается. Роль `menu` — у панели,
	а не у него: фокус без подсветки держит панель, и узел с ролью и фокусом
	должен быть один. Пункты — содержимое (`<Menu.Item>` и соседи), а без него —
	пункты из данных (`items`) по секциям показанных: одна разметка с подменю,
	сниппет `drawItems` модуля подменю.

	Своего портала у Svelte нет: панель — отдельный корень в обёртке, которую
	`Teleport` держит в `body`, и монтирует он его эффектом со всеми
	контекстами места. Пункты в нём читают лифт меню и входят в его коллекцию
	при своей инициализации — в браузере, после гидратации. На сервере панели и
	пунктов нет, как у Popover.

	Части стоят вплотную: пробел между блоками Svelte оставил бы в корне и в
	списке текстом.
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
			embedded="menu.frame"
			class={state.panelClasses}
			tabindex={-1}
			visible={state.open}
			position="fixed"
			anchor_anchor={binding.rootElement}
			anchor_point={state.point}
			anchor_placement={state.placement}
			anchor_offset={4}
			{...state.aria}
			{...state.dismiss_ownerAttribute}
		>
			<div class="so-menu__list">
				{#if props.children}
					{@render props.children()}
				{:else}
					{@render drawItems(state, props)}
				{/if}
			</div>
		</Frame>
	</Dynamic>
{/if}
