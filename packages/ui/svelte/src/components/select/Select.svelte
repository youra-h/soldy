<script lang="ts">
	import type { ISelectItem, TDrawnEntry } from '@soldy-ui/core'
	import {
		Dynamic,
		roleIcon,
		toControlAttrs,
		toRootForward,
		toRootProps,
		toStyleText,
	} from '../../adapter'
	import { Frame } from '../frame'
	import { Icon } from '../icon'
	import { Input } from '../input'
	import { Tags } from '../tags'
	import { SelectItem } from './item'
	import { SelectGroup } from './group'
	import { setupSelect } from './setup.component'
	import type { SelectAttributes, SelectProps } from './base.component'

	let { ref = $bindable(), ...props }: SelectProps = $props()
	const mountId = $props.id()

	const binding = setupSelect(() => props, mountId, (node) => (ref = node))
	const state = binding.state
	const field = binding.field

	// Стрелка без слота — метка роли: `tag` у Icon — корень, а не роль
	const ARROW = roleIcon('arrowDown')
</script>

<!--
	Select — поле выбора из списка (Combobox, select-only или `editable`), как у
	Vue: в корне поле и панель со списком.

	Корень — рамка: на нём `dataset` (`data-open` — стрелку тема разворачивает
	по нему) и `attrs`. Набор `aria` Select — имя, описание, ошибка — у поля:
	фокус всегда на `<input>`, а не в списке. Атрибуты потребителя делятся, как
	у поля и у Vue: класс и стиль — корню, остальное и attachment потребителя —
	`<input>` поля, поверх его наборов: `aria-label` и `id` потребителя
	называют комбобокс, а не корень без роли. `ref` — корень.

	Поле — готовый `Input` (слот `field` его заменяет): текст, плейсхолдер и
	ARIA комбобокса принадлежат экземпляру `TInput`, которым владеет Select
	(`field`), и разметка отдаёт его целиком (`ctrl={field}`) — рядом с ним
	ни текста, ни плейсхолдера. Свой набор `aria` Select кладёт на него
	атрибутами: они доходят до `<input>` поверх набора комбобокса, атрибуты
	потребителя — поверх обоих. Слоты поля по сторонам Select отдаёт всегда,
	как Vue свои шаблоны `leading` и `trailing`: обёртки поля стоят и без
	тегов. Кнопку очистки рисует поле, а не Select: свою кнопку слота `clear`
	Select отдаёт полю, только когда она задана.

	Слева — ряд тегов, пока выбор множественный: второй компонент со своей
	коллекцией, связку «опция ⇄ тег» держит `TSelectTagsExtension`. Слот
	`tags` получает инстанс тегов и его коллекцию — то, что встроенный `Tags`
	берёт `ctrl` и `engine`. За ними — слот `leading`. Справа — стрелка: класс
	на обёртке, а не на иконке, — по нему тема разворачивает стрелку, а
	`TSelectPointerPlugin` в `editable` открывает панель только кликом по ней;
	иконка из слота `arrow-icon` поворачивается так же. За ней — `trailing`.

	Панель — Frame: телепорт, слой, привязка к корню (`anchor_anchor` — корень
	из `rootElement` связки Select), пометка владельцем
	(`dismiss_ownerAttribute`): панель лежит вне поддерева Select, и нажатие в
	неё иначе считалось бы нажатием мимо. Открытость — это `visible` панели, а
	не `rendered`: опции входят в коллекцию при монтировании и выбывают при
	снятии, и закрытие, снимающее панель, вычистило бы вместе с ними выбор.
	Сторону и flip ядро выводит из `placement` (`panelPlacement`, `panelFlip`),
	ширину по полю — из `contentFit` (`autoFitWidth`); `panelDataset` — признак
	«тянут» (`data-swiping`).

	В панели — полоса жеста (пока жест включён; немая, прямой потомок панели и
	вне списка), затем список с набором `listAria` (`role="listbox"`, `id`,
	`aria-multiselectable`). В нём опции — содержимое (`<Select.Item>`,
	`<Select.Group>`), а без него — то, что рисует коллекция, по секциям
	группировки (`drawnSections`), ключ секции — её ключ: группа с подписью —
	в `SelectGroup`, опции без группы — прямо в списке, между соседними
	секциями, пока его просит Select (`groupSeparators`), — немой разделитель.
	В секции — её записи по порядку (сниппет `entries`), ключ — ключ записи:
	опции, а в окне обёртки `Virtual` — и распорки на месте пропущенных, `div`
	под `aria-hidden` со стилем от ядра. Пока показанных опций нет, на их
	месте слот `empty`.

	Слоты опций статические и получают опцию через scope. Проброс целиком: у
	каждого слота опции есть `item-<слот>` (`default` — `item`), scope — scope
	слота опции плюс сама опция, и отдаётся проброс опции, только когда слот
	задан Select: сниппет непрозрачен, и без `item-indicator-icon` опция
	рисует свою отметку, без `item` — текст.

	Своего портала у Svelte нет: панель — отдельный корень в обёртке, которую
	`Teleport` держит в `body`, и монтирует он его эффектом со всеми
	контекстами места. Опции в нём
	читают лифт Select и входят в его коллекцию при своей инициализации — в
	браузере, после гидратации. На сервере панели нет, как у всех оверлеев:
	Select из `items` сервер рисует с текстом выбранного (в `multiple` — с
	тегами), опции разметкой входят в коллекцию только в браузере.

	Части стоят вплотную: пробел между блоками Svelte оставил бы в корне, в
	панели и в списке текстом.
-->
{#snippet entries(list: ReadonlyArray<TDrawnEntry<ISelectItem>>)}
	{#each list as entry (entry.key)}
		{#if entry.kind === 'filler'}
			<div class="so-select__filler" aria-hidden="true" style={toStyleText(entry.style)}></div>
		{:else}
			{#snippet leading()}
				{@render props['item-leading']?.({ item: entry.item })}
			{/snippet}
			{#snippet content(scope: { text: string; selected: boolean })}
				{@render props.item?.({ ...scope, item: entry.item })}
			{/snippet}
			{#snippet trailing()}
				{@render props['item-trailing']?.({ item: entry.item })}
			{/snippet}
			{#snippet indicator(scope: { selected: boolean })}
				{@render props['item-indicator-icon']?.({ ...scope, item: entry.item })}
			{/snippet}
			<SelectItem
				ctrl={entry.item}
				leading={props['item-leading'] ? leading : undefined}
				trailing={props['item-trailing'] ? trailing : undefined}
				indicator-icon={props['item-indicator-icon'] ? indicator : undefined}
				children={props.item ? content : undefined}
			/>
		{/if}
	{/each}
{/snippet}
{#snippet fieldLeading()}
	{#if state.tags && state.tags_engine}
		{#if props.tags}
			{@render props.tags({ tags: state.tags, engine: state.tags_engine })}
		{:else}
			<Tags
				embedded="select.tags"
				class="so-select__tags"
				ctrl={state.tags}
				engine={state.tags_engine}
			/>
		{/if}
	{/if}{@render props.leading?.()}
{/snippet}
{#snippet fieldTrailing()}
	<span class="so-select__arrow"
		>{#if props['arrow-icon']}
			{@render props['arrow-icon']()}
		{:else}
			<Icon embedded="select.arrow" tag={ARROW} size={state.size} />
		{/if}</span
	>{@render props.trailing?.()}
{/snippet}
{#if state.rendered}
	<Dynamic
		tag="div"
		attributes={toRootProps(
			state,
			[state.dataset, state.attrs],
			toRootForward(binding.forwardProps),
		)}
		attach={binding.attachElement}
	>
		{#if props.field}
			{@render props.field({ field })}
		{:else}
			<Input
				embedded="select.field"
				class="so-select__field"
				ctrl={field}
				leading={fieldLeading}
				trailing={fieldTrailing}
				clear={props.clear}
				{...state.aria}
				{...toControlAttrs<SelectAttributes>(binding.forwardProps)}
			/>
		{/if}<Frame
			embedded="select.frame"
			class="so-select__panel"
			visible={state.open}
			position="fixed"
			anchor_anchor={binding.rootElement}
			anchor_placement={state.panelPlacement}
			anchor_flip={state.panelFlip}
			anchor_matchWidth={state.autoFitWidth}
			anchor_offset={4}
			{...state.panelDataset}
			{...state.dismiss_ownerAttribute}
		>
			{#if state.handleRendered}
				<div class="so-select__handle" aria-hidden="true"></div>
			{/if}<div class="so-select__list" {...state.listAria}>
				{#if props.children}
					{@render props.children()}
				{:else}
					{#each state.drawnSections ?? [] as section, index (section.key)}
						{#if state.groupSeparators && index > 0}<div
								class="so-select__separator"
								aria-hidden="true"
							></div>{/if}{#if section.group}<SelectGroup label={section.group.label}
								>{@render entries(section.entries)}</SelectGroup
							>{:else}{@render entries(section.entries)}{/if}
					{/each}
				{/if}{#if state.shown?.length === 0}
					{@render props.empty?.()}
				{/if}
			</div>
		</Frame>
	</Dynamic>
{/if}
