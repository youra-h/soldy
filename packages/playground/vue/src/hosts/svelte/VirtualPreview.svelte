<script lang="ts">
	import {
		COLLECTION_MANY_ITEMS,
		TABLE_COLUMNS,
		TABLE_MANY_ROWS,
	} from '@soldy-ui/playground-shared'
	import { ListBox, Table, Virtual } from '@soldy-ui/svelte'
	import type { TPreviewProps } from './previews'

	const bind: TPreviewProps = $props()
</script>

<!--
	Окно на списке и таблице по тысяче элементов: на пяти его не видно. ListBox
	с пределом строк прокручивается сам, таблица — в обёртке высотой 320 px;
	строка `enabled` включает и выключает окно у обоих. Элементы — данными
	(`items`): элементы разметкой окно не прячет. Ряд — граница ширины, как у
	Vue, React и Solid. Select в Svelte нет, и его окна рядом тоже.
	Переставленную колонку таблица ведёт целиком, с ячейками строк
	(`reorderPreview: 'column'`): в окне это сотни ячеек, а не тысячи.
-->
<Virtual {...bind}>
	<div style="display: flex; gap: 24px; align-items: flex-start; width: 100%">
		<ListBox items={COLLECTION_MANY_ITEMS} maxRows={8} aria_label="Пункты" />
		<div style="flex: 1; min-width: 0; height: 320px; overflow: auto">
			<Table
				items={TABLE_MANY_ROWS}
				columns={TABLE_COLUMNS}
				reorderPreview="column"
				aria_label="Сотрудники"
			/>
		</div>
	</div>
</Virtual>
