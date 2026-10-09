<script lang="ts">
import type { ITableRow, TAriaAttributes, TTableCell } from '@soldy-ui/core'

/** Входы ячеек — то, что строка уже получила, и сама строка для scope слота. */
interface ITableRowCellsProps {
	/** Строка ячеек — в scope слота `cell` её кладёт она сама */
	row: ITableRow
	/** Ячейки строки — по одной на показанную колонку, в её порядке */
	cells: TTableCell[]
	/** Набор каждой ячейки строки: у ячеек нет экземпляра */
	cellAria: TAriaAttributes
}

/**
 * Входы для рантайма Vue — через `extends`, как `base.component.ts` у
 * остальных компонентов: оттуда Vue их в тип не переносит, и тип входам даёт
 * аннотация `setup` (AGENTS.md, Pitfalls).
 */
const BaseTableRowCells = {
	props: {
		row: { type: Object, required: true },
		cells: { type: Array, required: true },
		cellAria: { type: Object, required: true },
	},
}

/**
 * Ячейки строки таблицы — внутренняя часть `Table.Row` без дескриптора и
 * контекста: своего у ячеек нет, всё, что они рисуют, строка уже получила от
 * фасада. Из пакета не экспортируется.
 *
 * Отдельный компонент — ради своей единицы перерисовки. Шаблон компонента Vue
 * перерисовывает целиком, и выбор строки (`data-selected` на `tr`, в сетке ещё
 * `aria-selected`) перерисовывал бы вместе с ней все её ячейки и звал бы слот
 * каждой — на «выбрать все» это тысячи строк. Отдельно ячейки перерисовываются,
 * только когда сменился их вход: ячейки (`change:cells` — колонки и запись
 * строки) или их набор (`change:cellAria`). Состояние, которое читает слот
 * потребителя, Vue отслеживает здесь же, в рендере ячеек: сменилось оно —
 * ячейки перерисованы, а строка нет.
 *
 * Граница держится, только пока слот `cell` стабилен: компонент с
 * динамическими слотами Vue перерисовывает вместе с родителем. Поэтому слот
 * сюда приходит пробросом по всей цепочке «таблица → строка → ячейки» и только
 * тогда, когда он есть у таблицы (AGENTS.md, Pitfalls).
 *
 * Разметка — ячейка на ячейку строки, ключ — колонка, без обёртки: ячейки —
 * дети `tr`. Набор ячейки — `data-align` колонки, набор ячеек строки и, у
 * заголовка строки, его `id`. Ячейка колонки `rowHeader` — заголовок строки:
 * `th` с `scope="row"`, на её текст ссылается имя чекбокса строки. Остальные —
 * `td`. Класс один: тема различает их тегом. Содержимое — слот `cell` со scope
 * `{ row, column, value }`, без него — `value` текстом.
 *
 * Узлов Vue на ячейку — два, сама ячейка и её текст. Тег выбирает
 * `<component :is>`, а не пара `th`/`td` под `<template v-for>`, и без слота
 * текст лежит прямо в ячейке, а не в `<slot>` с запасным содержимым. Обёртка
 * цикла и фрагмент слота — ещё два узла на каждую ячейку строки, которую
 * таблица размножает тысячами (BENCHMARKS.md, 869fekb4g). Поэтому слот и текст
 * — разными ветками.
 *
 * Пояснения — здесь, а не в шаблоне: корень шаблона — цикл, и комментарий
 * рядом с ним сделал бы корнем фрагмент, а внутри цикла повторился бы в каждой
 * ячейке.
 */
export default {
	name: '_TableRowCells',
	extends: BaseTableRowCells,
	/** Своего у ячеек нет: шаблон читает входы как есть, `setup` даёт им тип. */
	setup(_props: ITableRowCellsProps): void {},
}
</script>

<template>
	<template v-if="$slots.cell">
		<component
			:is="cell.rowHeader ? 'th' : 'td'"
			v-for="cell in cells"
			:key="cell.column.uid"
			class="s-table-row__cell"
			:scope="cell.rowHeader ? 'row' : undefined"
			v-bind="{ ...cell.dataset, ...cellAria, ...cell.aria }"
		>
			<slot name="cell" :row="row" :column="cell.column" :value="cell.value">{{
				cell.value
			}}</slot>
		</component>
	</template>
	<template v-else>
		<component
			:is="cell.rowHeader ? 'th' : 'td'"
			v-for="cell in cells"
			:key="cell.column.uid"
			class="s-table-row__cell"
			:scope="cell.rowHeader ? 'row' : undefined"
			v-bind="{ ...cell.dataset, ...cellAria, ...cell.aria }"
			>{{ cell.value }}</component
		>
	</template>
</template>
