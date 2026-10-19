<script lang="ts">
	import { Dynamic, toStyleText, toWrappedRootProps } from '../../adapter'
	import { CheckBox } from '../check-box'
	import { TableColumn } from './column'
	import { TableRow } from './row'
	import { setupTable } from './setup.component'
	import type { TableProps } from './base.component'

	let { ref = $bindable(), ...props }: TableProps = $props()
	const mountId = $props.id()

	const binding = setupTable(() => props, mountId, (node) => (ref = node))
	const state = binding.state
	const facade = binding.facade

	// Класс окна — разметка вокруг таблицы, а не её корень
	const VIEWPORT = 'so-table__viewport'
</script>

<!--
	Table — таблица по паттернам APG Table и Sortable Table, как у Vue, React и
	Solid. Корень — сама `table`, рисуется по `tag`: роль `table` даёт тег,
	своей клавиатуры у таблицы нет. В режиме сетки (`grid`, APG Data Grid) роль
	`grid`, `aria-multiselectable` и остановку Tab таблице пишет коллекция в её
	`aria`, а клавиши и фокус ячеек ведёт плагин сетки на корне. Имя таблице —
	`aria_label` или `aria_labelledBy`.

	Окно таблицы — разметка `div.so-table__viewport` вокруг корня: в окне
	таблица прокручивается вбок, когда колонки шире места, — прокрутку включает
	тема по `data-overflow` таблицы. Окно — внешний узел компонента, и класс,
	стиль и `ref` потребителя (`consumerRef`) и скрытие достаются ему, а
	классы, наборы, привязка корня к `TElementPlugin` (`bindRef`) и поверх
	наборов остальные атрибуты и attachment-ы потребителя — таблице
	(`toWrappedRootProps`), как у Vue, React и Solid: `aria-label` и `id`
	потребителя называют таблицу, а не окно без роли.

	Логики в разметке нет: заголовки — показанные колонки коллекции
	(`shownColumns`), тело — то, что рисует коллекция строк (`drawn`), число
	колонок и счёт выбора — выходы коллекции. Колонки и строки задаются только
	данными (`columns`, `items`): частей разметкой у таблицы нет, поэтому и
	сниппета `children` нет.

	Шапка: строка с набором `headRowAria` (у неё нет экземпляра — его держит
	коллекция). Первая ячейка — колонка выбора, пока режим выбора не `none`: в
	`multiple` — заголовок с чекбоксом «выбрать все» (`embedded:
	'table.select-all'`) над экземпляром, который держит таблица (`selectAll`),
	имя — выход плагина имён; в `single` — пустая `td`: пустой заголовок
	скринридеры считают ошибкой. Набор ячейки (`cellAria`) — коллекции: в сетке
	ячейка принимает фокус.

	Дальше — `Table.Column` на каждую показанную колонку, ключ — колонка.
	Подпись и кнопку сортировки рядом с ней рисует сама колонка: кнопка — её,
	нажатие — её просьба, которую выполняет коллекция. Таблица отдаёт колонке
	только подпись — слот `header` пробросом: сниппет, который колонка зовёт со
	своим scope (`text`, `sortable`), а он добавляет к нему колонку. Сниппет
	непрозрачен, поэтому проброс отдаётся колонке, только когда слот задан
	таблице: заданный, он рисуется в каждом заголовке вместо текста, без него —
	текст колонки. Свой контрол в подписи — кнопка, триггер Popover — и есть
	своё действие по заголовку: нажатие по ячейке не сортирует.

	Тело — одна петля по `drawn`, ключ — ключ записи: записи новые на каждую
	смену, а узел записи держит её ключ, и строка, оставшаяся в окне, — тот же
	узел вместе с фокусом сетки. Без окна это все показанные строки. В окне
	обёртки `Virtual` — строки окна и распорки на месте пропущенных: `tr` под
	`aria-hidden` с ячейкой во всю ширину таблицы (`columnCount`), высоту
	которой тема берёт из её стиля, а стиль пишет ядро. Строка — `Table.Row`
	над элементом коллекции строк; сниппет `cell` уходит ей как есть: scope
	слотов таблицы и строки один, а строку в него кладут её ячейки. Пока
	показанных строк нет — строка с одной ячейкой во всю ширину, содержимое —
	сниппет `empty`.

	Строка, смонтированная в теле, читает движок и регистратор таблицы лифтом
	(`setContext` таблицы) и входит в её коллекцию при своей инициализации.

	Шапка и тело стоят вплотную: пробел между ними Svelte оставил бы в таблице
	текстом.
-->
{#if state.rendered}
	{@const layout = toWrappedRootProps(
		state,
		[state.attrs, state.aria, state.dataset],
		binding.forwardProps,
		VIEWPORT,
	)}
	<Dynamic tag="div" attributes={layout.wrapper} attach={binding.consumerRef}>
		<Dynamic tag={state.tag} attributes={layout.root} attach={binding.bindRef}>
			<thead class="so-table__head">
				<tr class="so-table__head-row" {...state.headRowAria}>
					{#if state.mode === 'multiple'}
						<th class="so-table__select" {...state.cellAria}>
							<CheckBox
								embedded="table.select-all"
								ctrl={facade.selectAll}
								aria_label={state.names_selectAll}
							/>
						</th>
					{:else if state.mode === 'single'}
						<td class="so-table__select" {...state.cellAria}></td>
					{/if}
					{#each state.shownColumns ?? [] as column (column.uid)}
						{#snippet caption(scope: { text: string; sortable: boolean })}
							{@render props.header?.({ ...scope, column })}
						{/snippet}
						<TableColumn ctrl={column} children={props.header ? caption : undefined} />
					{/each}
				</tr>
			</thead><tbody class="so-table__body">
				{#each state.drawn ?? [] as entry (entry.key)}
					{#if entry.kind === 'filler'}
						<tr
							class="so-table__filler-row"
							aria-hidden="true"
							style={toStyleText(entry.style)}
						>
							<td class="so-table__filler" colspan={state.columnCount}></td>
						</tr>
					{:else}
						<TableRow ctrl={entry.item} cell={props.cell} />
					{/if}
				{/each}
				{#if state.shown?.length === 0}
					<tr class="so-table__empty-row">
						<td class="so-table__empty" colspan={state.columnCount}>
							{@render props.empty?.()}
						</td>
					</tr>
				{/if}
			</tbody>
		</Dynamic>
	</Dynamic>
{/if}
