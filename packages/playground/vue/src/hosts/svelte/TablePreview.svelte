<script lang="ts">
	import { TABLE_COLUMNS, TABLE_ROWS, TABLE_SCROLL_ROWS } from '@soldy-ui/playground-shared'
	import { Table } from '@soldy-ui/svelte'
	import type { TPreviewProps } from './previews'

	const bind: TPreviewProps = $props()
</script>

<!--
	Строки и колонки — данными, как у Vue, React и Solid: частей разметкой у
	таблицы нет. Обёртка — граница ширины, а с закреплённой шапкой — ещё и окно
	прокрутки высотой 320 px на сорок строк. Окно таблицы — на странице
	Virtual.
-->
<div style={bind.stickyHead ? 'width: 100%; height: 320px; overflow: auto' : 'width: 100%'}>
	<Table
		items={bind.stickyHead ? TABLE_SCROLL_ROWS : TABLE_ROWS}
		columns={TABLE_COLUMNS}
		{...bind}
	/>
</div>
