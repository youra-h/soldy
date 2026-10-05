<script lang="ts">
import { Button } from '../button'
import { CheckBox } from '../check-box'
import { Icon } from '../icon'
import { TableColumn } from './column'
import { TableRow } from './row'
import SetupTable from './setup.component'

export default { ...SetupTable, components: { Button, CheckBox, Icon, TableColumn, TableRow } }
</script>

<template>
	<component
		ref="rootElement"
		:is="tag"
		v-if="rendered"
		v-show="visible"
		:class="classes"
		v-bind="{ ...attrs, ...aria, ...dataset }"
	>
		<!--
			Table — таблица по паттернам APG Table и Sortable Table. Корень — сама
			`table`, рисуется по `tag`: роль `table` даёт тег, своей клавиатуры у
			таблицы нет (Grid — отдельный режим). Имя таблице — `aria_label` или
			`aria_labelledBy`.

			Логики в разметке нет: заголовки — показанные колонки коллекции
			(`shownColumns`), строки — показанные строки (`shown`: в порядке
			сортировки), ячейки — ячейки строки (`cells`), счёт выбора и число
			колонок — выходы коллекции. Колонки задаются только данными
			(`columns`), строки — только данными (`items`): частей разметкой у
			таблицы нет, поэтому и слота по умолчанию нет.
		-->

		<thead class="s-table__head">
			<tr class="s-table__head-row">
				<!--
					Заголовок колонки выбора — первая ячейка шапки. Колонка выбора есть,
					только пока режим выбора строк не `none`: один факт решает и выбор, и
					колонку. Это разметка таблицы, а не колонка коллекции: запись
					`columns` сверкой по `field` её бы удалила.

					В `multiple` — заголовок с чекбоксом «выбрать все показанные»:
					CheckBox (`embedded: 'table.select-all'`) над экземпляром, который
					держит таблица (`selectAll`). Отметку, «часть» и «выключен» она пишет
					ему из счёта выбора (`shownSelection`), а клик по нему — просьба
					выбрать или снять показанные строки, которую она выполняет сама.
					Имя — пропом таблицы, английским по умолчанию: своего текста у ячейки
					нет.

					В `single` выбирать все нечего, и ячейка пуста — `td`, а не `th`:
					пустой заголовок скринридеры и проверки доступности считают
					ошибкой. Она только держит колонку.
				-->
				<th v-if="mode === 'multiple'" class="s-table__select">
					<CheckBox
						embedded="table.select-all"
						:ctrl="selectAll"
						:aria_label="selectAllLabel"
					/>
				</th>
				<td v-else-if="mode === 'single'" class="s-table__select"></td>

				<!--
					Заголовок колонки — Table.Column над экземпляром колонки, по одному на
					показанную колонку, ключ — колонка. Его содержимое — одно из двух,
					по `sortable` колонки; текст — слот `header` со scope `{ column }`,
					колонку выбирают условием по `column.field`. Без него — текст колонки.
				-->
				<TableColumn v-for="column in shownColumns" :key="column.uid" :ctrl="column">
					<template #default="{ text, sortable }">
						<!--
							Сортируемая колонка — кнопка в заголовке, как в APG Sortable
							Table: Button (`embedded: 'table.sort'`), нажатие — команда
							коллекции `toggleSort(field)`. Вида разметка ей не передаёт:
							красит её тема по контексту (`:where(.s-table-column__sort)`).
							Выключена вместе с таблицей: сортировать её строки нельзя.
							Текст — внутри кнопки: её имя — текст заголовка.

							Отметка направления — в слоте кнопки `trailing`, после текста:
							иконка роли `arrowUpward`. Обёртка отметки скрыта от
							скринридера: направление он объявляет по `aria-sort`
							заголовка. Отметка стоит и у неотсортированной колонки,
							невидимой: держит место, и текст не сдвигается, когда колонку
							отсортируют. Вниз стрелку поворачивает тема, номер приоритета
							при сортировке по нескольким колонкам дописывает тоже она — у
							обёртки отметки.
						-->
						<Button
							v-if="sortable"
							embedded="table.sort"
							class="s-table-column__sort"
							:size="size"
							:disabled="disabled"
							@action:press="facade.toggleSort(column.field)"
						>
							<slot name="header" :column="column">{{ text }}</slot>

							<template #trailing>
								<span class="s-table-column__sort-icon" aria-hidden="true">
									<Icon
										embedded="table.sort-icon"
										:tag="sortIconTag"
										:size="size"
									/>
								</span>
							</template>
						</Button>

						<!--
							Несортируемая колонка — только текст заголовка. Обёртка — для
							темы: выключенная таблица гасит текст, а кнопку гасит сама
							кнопка.
						-->
						<span v-else class="s-table-column__text">
							<slot name="header" :column="column">{{ text }}</slot>
						</span>
					</template>
				</TableColumn>
			</tr>
		</thead>

		<tbody class="s-table__body">
			<!--
				Строка — Table.Row над элементом коллекции строк, по одной на
				показанную строку, ключ — строка. Содержимое ячейки — слот `cell` со
				scope `{ row, column, value }`: колонку выбирают условием по
				`column.field`, `value` — поле записи под ключом колонки. Без него —
				`value` текстом.
			-->
			<TableRow v-for="row in shown" :key="row.uid" :ctrl="row">
				<template #cell="{ column, value }">
					<slot name="cell" :row="row" :column="column" :value="value">{{ value }}</slot>
				</template>
			</TableRow>

			<!--
				Пустое состояние — пока показанных строк нет: строка с одной ячейкой
				на всю ширину таблицы. `colspan` — число показанных колонок вместе с
				колонкой выбора, готовым значением ядра (`columnCount`): посчитанное
				в разметке повторилось бы в каждом адаптере. Содержимое — слот
				`empty`; без него ячейка пуста, и под шапкой остаётся пустая полоса —
				таблица без строк не схлопывается в одну шапку.
			-->
			<tr v-if="shown.length === 0" class="s-table__empty-row">
				<td class="s-table__empty" :colspan="columnCount">
					<slot name="empty" />
				</td>
			</tr>
		</tbody>
	</component>
</template>
