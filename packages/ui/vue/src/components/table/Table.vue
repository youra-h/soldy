<script lang="ts">
import { CheckBox } from '../check-box'
import { TableColumn } from './column'
import { TableRow } from './row'
import SetupTable from './setup.component'

export default { ...SetupTable, components: { CheckBox, TableColumn, TableRow } }
</script>

<template>
	<div v-if="rendered" v-show="visible" class="so-table__viewport">
		<!--
			Окно таблицы — разметка вокруг неё, а не корень: корень, классы и
			наборы — у самой `table`, плагины и тема видят корнем её. В окне
			таблица прокручивается вбок, когда колонки шире места: прокрутку
			включает тема по `data-overflow` таблицы — его пишет раскладка
			колонок. Ширину окна мерит плагин раскладки таблицы, по ней ядро
			раскладывает колонки без своей ширины. Атрибуты потребителя
			достаются окну — внешнему узлу компонента.

			Table — таблица по паттернам APG Table и Sortable Table. Корень — сама
			`table`, рисуется по `tag`: роль `table` даёт тег, своей клавиатуры у
			таблицы нет. В режиме сетки (`grid`, APG Data Grid) роль `grid`,
			`aria-multiselectable` и остановку Tab таблице пишет коллекция в её
			`aria`, а клавиши и фокус ячеек ведёт плагин сетки на корне. Имя
			таблице — `aria_label` или `aria_labelledBy`.

			Логики в разметке нет: заголовки — показанные колонки коллекции
			(`shownColumns`), строки — показанные строки (`shown`: в порядке
			сортировки), ячейки — ячейки строки (`cells`), счёт выбора и число
			колонок — выходы коллекции. Колонки задаются только данными
			(`columns`), строки — только данными (`items`): частей разметкой у
			таблицы нет, поэтому и слота по умолчанию нет.
		-->
		<component
			ref="rootElement"
			:is="tag"
			:class="classes"
			v-bind="{ ...attrs, ...aria, ...dataset }"
		>
			<thead class="so-table__head">
				<!--
					Набор строки шапки (`headRowAria`) — у неё нет экземпляра, и его
					держит коллекция: в окне это номер шапки среди строк таблицы.
				-->
				<tr class="so-table__head-row" v-bind="headRowAria">
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

						Экземпляра у ячейки нет, и её набор держит коллекция (`cellAria`):
						в сетке ячейка принимает фокус.
					-->
					<th v-if="mode === 'multiple'" class="so-table__select" v-bind="cellAria">
						<CheckBox
							embedded="table.select-all"
							:ctrl="selectAll"
							:aria_label="names_selectAll"
						/>
					</th>
					<td
						v-else-if="mode === 'single'"
						class="so-table__select"
						v-bind="cellAria"
					></td>

					<!--
						Заголовок колонки — Table.Column над экземпляром колонки, по одному на
						показанную колонку, ключ — колонка. Подпись и кнопку сортировки рядом
						с ней рисует сама колонка: кнопка — её, нажатие — её просьба, которую
						выполняет коллекция. Таблица отдаёт колонке только подпись — слот
						`header` со scope слота колонки (`text`, `sortable`) и самой колонкой
						(`column`), колонку выбирают условием по `column.field`. Без него —
						текст колонки. Свой контрол в подписи — кнопка, триггер Popover — и
						есть своё действие по заголовку: нажатие по ячейке не сортирует.
					-->
					<TableColumn v-for="column in shownColumns" :key="column.uid" :ctrl="column">
						<template #default="{ text, sortable }">
							<slot
								name="header"
								:column="column"
								:text="text"
								:sortable="sortable"
								>{{ text }}</slot
							>
						</template>
					</TableColumn>
				</tr>
			</thead>

			<tbody class="so-table__body">
				<!--
					Тело — то, что рисует коллекция (`drawn`), по порядку, ключ — ключ
					записи. Без окна это все показанные строки. В окне обёртки `Virtual` —
					строки окна и распорки на месте пропущенных строк: `tr` под
					`aria-hidden` с одной ячейкой во всю ширину таблицы (`columnCount`),
					высоту которой тема берёт из её стиля. Одна петля на строки и
					распорки: петли по блокам перемонтировали бы строку, когда она
					переходит из блока в блок, и фокус в ней терялся бы.

					Строка — Table.Row над элементом коллекции строк. Содержимое ячейки —
					слот `cell` со scope `{ row, column, value }`: колонку выбирают
					условием по `column.field`, `value` — поле записи под ключом колонки.
					Без него — `value` текстом.

					Строки не перерисовываются вместе с таблицей, только пока их слоты
					стабильны. Поэтому слот уходит им пробросом как есть — строку в scope
					кладёт сама строка — и веткой: слота у таблицы нет — строкам слотов
					не передают вовсе, проброс у компонента без слотов Vue считает
					динамическим. Слот появился или пропал — строки монтируются заново.
					Переменная цикла — не `row`: компилятор сверяет имена, а не области
					видимости, и одноимённый параметр слота сделал бы слоты
					динамическими (AGENTS.md, Pitfalls).
				-->
				<template v-if="$slots.cell">
					<template v-for="entry in drawn" :key="entry.key">
						<tr
							v-if="entry.kind === 'filler'"
							class="so-table__filler-row"
							aria-hidden="true"
							:style="entry.style"
						>
							<td class="so-table__filler" :colspan="columnCount"></td>
						</tr>
						<TableRow v-else :ctrl="entry.item">
							<template #cell="{ row, column, value }">
								<slot name="cell" :row="row" :column="column" :value="value">{{
									value
								}}</slot>
							</template>
						</TableRow>
					</template>
				</template>
				<template v-else>
					<template v-for="entry in drawn" :key="entry.key">
						<tr
							v-if="entry.kind === 'filler'"
							class="so-table__filler-row"
							aria-hidden="true"
							:style="entry.style"
						>
							<td class="so-table__filler" :colspan="columnCount"></td>
						</tr>
						<TableRow v-else :ctrl="entry.item" />
					</template>
				</template>

				<!--
					Пустое состояние — пока показанных строк нет: строка с одной ячейкой
					на всю ширину таблицы. `colspan` — число показанных колонок вместе с
					колонкой выбора, готовым значением ядра (`columnCount`): посчитанное
					в разметке повторилось бы в каждом адаптере. Содержимое — слот
					`empty`; без него ячейка пуста, и под шапкой остаётся пустая полоса —
					таблица без строк не схлопывается в одну шапку.
				-->
				<tr v-if="shown.length === 0" class="so-table__empty-row">
					<td class="so-table__empty" :colspan="columnCount">
						<slot name="empty" />
					</td>
				</tr>
			</tbody>
		</component>
	</div>
</template>
