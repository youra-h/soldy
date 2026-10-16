<script lang="ts">
import { Button } from '../button'
import { Icon } from '../icon'
import { PaginationItem } from './item'
import SetupPagination from './setup.component'

export default { ...SetupPagination, components: { Button, Icon, PaginationItem } }
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
			Pagination — ряд в одну строку: стрелка «назад», список страниц,
			стрелка «вперёд». Корень рисуется по `tag` (по умолчанию `nav`):
			ориентир для скринридера. Имя ему даёт приложение — `aria_label` или
			`aria_labelledBy`, они в наборе `aria`: что листают, знает только оно.
			На корне — модификаторы `--size-*` и `--variant-*` и `data-disabled`.

			Стрелки стоят вне списка: в списке только страницы и пропуски.
			Отдельных кнопок «в начало» и «в конец» нет — их роль играют первая
			и последняя страницы, они видны всегда.
		-->

		<!--
			Стрелка «назад» — на предыдущую страницу (`ctrl.prev()`). `size` и
			`variant` — пагинации: цвет тема берёт с модификатора кнопки.
			Выключенность считает пагинация (`prevDisabled`: первая страница,
			текущей нет или выключен компонент), имя из локали — в наборе
			`prevAria`. Вида нет: `plain` и квадрат даёт тема по контексту. Иконка
			— роль `arrowRight`, у обеих стрелок: «назад» тема зеркалит по
			направлению строки. Слот `prev-icon` — своя иконка; в слот кладут
			стрелку, которая смотрит в конец строки, — тема зеркалит и её.
		-->
		<Button
			embedded="pagination.prev"
			type="button"
			class="so-pagination__prev"
			:size="size"
			:variant="variant"
			:disabled="prevDisabled"
			@click="ctrl.prev()"
			v-bind="prevAria"
		>
			<slot name="prev-icon">
				<Icon embedded="pagination.prev-icon" :tag="arrowIconTag" :size="size" />
			</slot>
		</Button>

		<ol class="so-pagination__list">
			<!--
				Страницы и пропуски — по порядку окна (`cells`): первая страница,
				пропуск, N страниц вокруг текущей, пропуск, последняя
				(`1 … 4 5 6 … 10`). Страница — элемент коллекции; в коллекции
				только страницы окна. Пропуск — разметка владельца там, где между
				соседними страницами окна пропущены две и больше: одну
				пропущенную окно показывает страницей (`1 2 3 4 5 … 10`).

				Ключ места — `cell.key`: у страницы её `uid`. Страница, оставшаяся
				на экране при сдвиге окна, — тот же экземпляр, и узел с фокусом на
				нём не пересобирается.

				Слот страницы пробрасывается целиком: `item`, scope — scope слота
				страницы (`text`) плюс сама страница.
			-->
			<template v-for="cell in cells" :key="cell.key">
				<PaginationItem v-if="cell.kind === 'item'" :ctrl="cell.item">
					<template #default="{ text }">
						<slot name="item" :item="cell.item" :text="text" />
					</template>
				</PaginationItem>

				<!--
					Пропуск — не кнопка и не иконка: на нём ничего не нажимают, и
					фокуса у него нет. Многоточие — текстом. Клетку той же ширины,
					что узкая страница, даёт тема.
				-->
				<li v-else class="so-pagination__ellipsis">…</li>
			</template>
		</ol>

		<!--
			Стрелка «вперёд» — на следующую страницу (`ctrl.next()`);
			выключена на последней (`nextDisabled`). Остальное — как у «назад»,
			имя из локали — в наборе `nextAria`, слот — `next-icon`.
		-->
		<Button
			embedded="pagination.next"
			type="button"
			class="so-pagination__next"
			:size="size"
			:variant="variant"
			:disabled="nextDisabled"
			@click="ctrl.next()"
			v-bind="nextAria"
		>
			<slot name="next-icon">
				<Icon embedded="pagination.next-icon" :tag="arrowIconTag" :size="size" />
			</slot>
		</Button>
	</component>
</template>
