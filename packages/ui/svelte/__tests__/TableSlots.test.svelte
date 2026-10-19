<script lang="ts" module>
	/**
	 * Сниппеты таблицы разметкой — по одному на случай:
	 *
	 * - `header` — подпись заголовка `<b>поле:текст колонки</b>`;
	 * - `header-scope` — подпись от scope слота: `<b>поле:текст:сортируемость</b>`;
	 * - `header-button` — кнопка в подписи, её нажатие отдаёт поле колонки `onOpen`;
	 * - `header-age` — подпись рисуется только у колонки `age`;
	 * - `cell` — ячейка колонки `age` — `<i>ключ записи/значение</i>`, остальные —
	 *   значение;
	 * - `cell-age` — ячейка рисуется только у колонки `age`.
	 */
	export type TTableSlotsCase =
		| 'header'
		| 'header-scope'
		| 'header-button'
		| 'header-age'
		| 'cell'
		| 'cell-age'
</script>

<script lang="ts">
	/**
	 * Тестовая обёртка: таблица со сниппетами, которые рисуют своё не всегда —
	 * по условию внутри сниппета, — или со своим контролом. Такой сниппет
	 * объявляется только в `.svelte`. Пропсы таблицы — `table`.
	 */
	import type { ITableColumn, ITableRow } from '@soldy-ui/core'
	import { Table, type TableProps } from '@soldy-ui/svelte'

	type THeaderScope = { column: ITableColumn; text: string; sortable: boolean }
	type TCellScope = { row: ITableRow; column: ITableColumn; value: unknown }

	type THarnessProps = {
		case: TTableSlotsCase
		table: TableProps
		/** Нажатие кнопки в подписи — поле колонки. */
		onOpen?: (field: string) => void
	}

	const props: THarnessProps = $props()

	/** Ключ записи строки. */
	const idOf = (row: ITableRow) => Reflect.get(row.data ?? {}, 'id')
</script>

{#snippet header({ column }: THeaderScope)}<b>{column.field}:{column.text}</b>{/snippet}

{#snippet headerScope({ column, text, sortable }: THeaderScope)}
	<b>{column.field}:{text}:{String(sortable)}</b>
{/snippet}

{#snippet headerButton({ column, text }: THeaderScope)}
	<button type="button" class="menu" onclick={() => props.onOpen?.(column.field)}>{text}</button>
{/snippet}

{#snippet headerAge({ column, text }: THeaderScope)}
	{#if column.field === 'age'}<b>{text}</b>{/if}
{/snippet}

{#snippet cell({ row, column, value }: TCellScope)}
	{#if column.field === 'age'}<i>{String(idOf(row))}/{String(value)}</i>{:else}{String(value)}{/if}
{/snippet}

{#snippet cellAge({ column, value }: TCellScope)}
	{#if column.field === 'age'}<i>{String(value)}</i>{/if}
{/snippet}

{#if props.case === 'header'}
	<Table {...props.table} {header} />
{:else if props.case === 'header-scope'}
	<Table {...props.table} header={headerScope} />
{:else if props.case === 'header-button'}
	<Table {...props.table} header={headerButton} />
{:else if props.case === 'header-age'}
	<Table {...props.table} header={headerAge} />
{:else if props.case === 'cell'}
	<Table {...props.table} {cell} />
{:else}
	<Table {...props.table} cell={cellAge} />
{/if}
