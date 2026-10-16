<script lang="ts">
import { Button } from '../../button'
import { Icon } from '../../icon'
import SetupTableColumn from './setup.component'

export default { ...SetupTableColumn, components: { Button, Icon } }
</script>

<template>
	<component
		ref="rootElement"
		:is="tag"
		v-if="rendered"
		v-show="visible"
		:class="classes"
		:style="widthStyle"
		v-bind="{ ...attrs, ...aria, ...dataset }"
	>
		<!--
			Заголовок колонки — Table.Column. Корень — сама ячейка шапки, рисуется
			по `tag` колонки (по умолчанию `th`). На ней наборы колонки: `aria-sort`
			(только у первой по приоритету — по ARIA его ставят одному заголовку),
			`data-sort` и `data-sort-priority` (пишет расширение сортировки),
			`data-align`, `data-sized` (ширина известна: своя или раскладки) и
			`data-resizing` (тянут ручку), — и ширина переменной
			`--so-table-column-width` (`widthStyle`, считает ядро): тема кладёт её в
			ширину ячейки шапки, и по ней раскладка таблицы режет колонку.

			Имя заголовка — ссылка на подпись (`aria-labelledby` в `aria`): своё
			имя браузер собрал бы из всей ячейки, а в ней и значение поля ручки
			(«Имя 150»), и имя кнопки сортировки. Ссылку и `id` подписи пишет
			плагин связок.

			Обработчиков на ячейке нет: протяжку ловит плагин ручки на корне,
			клавиши и жест скринридера — он же на поле. Нажатие по ячейке не
			сортирует — сортирует кнопка рядом с подписью: действие на `th`,
			у которого нет фокуса, с клавиатуры было бы недоступно.
		-->

		<!--
			Содержимое — ряд: подпись, а у сортируемой колонки за ней кнопка
			сортировки. Где ряд стоит в ячейке и с какой стороны подписи кнопка,
			решает тема по `data-align`.

			Подпись — у всех колонок: слот по умолчанию со scope `{ text, sortable }`,
			пустой — текст колонки. Таблица кладёт в него свой слот `header`, и
			потребитель ставит туда свой контрол — кнопку, триггер Popover: это и
			есть своё действие по заголовку. Подписью названы заголовок и поле
			ручки (`textAria`). Выключенная таблица гасит подпись темой: своего
			состояния у неё нет.
		-->
		<span class="so-table-column__content">
			<span class="so-table-column__text" v-bind="textAria">
				<slot :text="text" :sortable="sortable">{{ text }}</slot>
			</span>

			<!--
				Кнопка сортировки — Button (`embedded: 'table.sort'`), как в APG
				Sortable Table, только у `sortable`. Рисует её колонка, а не таблица
				через слот: подпись называет заголовок, и кнопка в ней дописала бы
				своё имя к его имени. Нажатие — просьба колонки (`toggleSort`),
				сортирует расширение коллекции строк по своим правилам. Выключена
				вместе с таблицей — `disabled` колонке пишет таблица.

				Текста у кнопки нет, в ней одна стрелка: имя ей пишет плагин имён от
				локали вместе с подписью колонки (`sortAria`) — «Sort by Имя».
				Направление скринридер объявляет по `aria-sort` заголовка, поэтому
				обёртка стрелки скрыта от него. Стрелка — иконка роли `arrowUpward`:
				вниз её поворачивает тема, номер приоритета при сортировке по
				нескольким колонкам дописывает тоже она, у обёртки стрелки.

				Вида и размера разметка кнопке и стрелке не передаёт: колонка не знает
				размера таблицы, а значения вида объявляет тема. Квадрат вокруг
				стрелки и вид ей даёт тема по контексту (`:where(.so-table-column__sort)`).
			-->
			<Button
				v-if="sortable"
				embedded="table.sort"
				type="button"
				class="so-table-column__sort"
				:disabled="disabled"
				v-bind="sortAria"
				@action:press="column.toggleSort()"
			>
				<span class="so-table-column__sort-icon" aria-hidden="true">
					<Icon embedded="table.sort-icon" :tag="sortIconTag" />
				</span>
			</Button>
		</span>

		<!--
			Ручка ширины — полоса у края заголовка, только когда она есть
			(`resizerRendered`: колонка `resizable`, не выключена, и ширина
			известна). Разметка, а не часть: потребитель её не адресует. Где
			полоса стоит и как видна, решает тема.

			Нативное поле — как поле ручки Slider: мобильные скринридеры двигают
			его своим жестом. Ход и ширина — значение ядра (`resizer`), имя —
			ссылка на подпись (`resizerAria`): ровно подпись колонки. Тема делает
			поле прозрачным во всю полосу и не пускает к нему указатель: тянет
			плагин, а не браузер.
		-->
		<span v-if="resizerRendered" class="so-table-column__resizer">
			<input
				class="so-table-column__input"
				type="range"
				:min="resizer.min"
				:max="resizer.max"
				:value="resizer.value"
				v-bind="resizerAria"
			/>
		</span>
	</component>
</template>
