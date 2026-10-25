<script lang="ts">
	import {
		COLLECTION_MANY_ITEMS,
		TABLE_COLUMNS,
		TABLE_MANY_ROWS,
	} from '@soldy-ui/playground-shared'
	import { ListBox, Select, Table, Virtual } from '@soldy-ui/svelte'
	import type { TPreviewProps } from './previews'

	const bind: TPreviewProps = $props()
</script>

<!--
	Окно на трёх списках по тысяче элементов: на пяти его не видно. ListBox с
	пределом строк прокручивается сам, у Select прокручивается список его
	панели, таблица — в обёртке высотой 320 px; строка `enabled` включает и
	выключает окно у всех разом. Элементы — данными (`items`): элементы
	разметкой окно не прячет. Ряд — граница ширины, как у Vue. Select — в
	колонке своей ширины: поле во всю ширину места, и в ряду оно забрало бы
	место таблицы. Переставленную колонку таблица ведёт целиком, с ячейками
	строк (`reorderPreview: 'column'`): в окне это сотни ячеек, а не тысячи.
-->
<Virtual {...bind}>
	<div style="display: flex; gap: 24px; align-items: flex-start; width: 100%">
		<ListBox items={COLLECTION_MANY_ITEMS} maxRows={8} aria_label="Пункты" />
		<div style="flex: none; width: 220px">
			<Select items={COLLECTION_MANY_ITEMS} placeholder="Выберите" />
		</div>
		<div style="flex: 1; min-width: 0; height: 320px; overflow: auto">
			<Table
				items={TABLE_MANY_ROWS}
				columns={TABLE_COLUMNS}
				reorderPreview="column"
				resizable
				reorderable
				aria_label="Сотрудники"
			/>
		</div>
	</div>
</Virtual>
