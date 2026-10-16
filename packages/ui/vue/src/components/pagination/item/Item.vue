<script lang="ts">
import { Button } from '../../button'
import SetupPaginationItem from './setup.component'

/**
 * Страница — внутренняя часть пагинации: её рисует только `Pagination`, по
 * одной на каждую страницу окна, и наружу пакета она не выходит.
 *
 * Атрибуты снаружи падают на корень сами: ставит страницу только владелец, и
 * своих атрибутов у него для неё нет.
 */
export default { ...SetupPaginationItem, components: { Button } }
</script>

<template>
	<component
		ref="rootElement"
		:is="tag"
		v-if="rendered"
		v-show="visible"
		:class="classes"
		v-bind="{ ...attrs, ...dataset }"
	>
		<!--
			Страница — внутренняя часть Pagination, как тост у Toasts: её рисует
			только владелец, по одной на каждую страницу окна, потребитель её в
			разметку не ставит, и из пакета она не выходит.

			Корень — место страницы в списке, рисуется по `tag` (по умолчанию
			`li`). На нём набор `dataset`: `data-selected` (текущая — пишет
			активация коллекции, как у таба) и `data-disabled`.

			Строка — Button с номером или текстом страницы (слот `default` со
			scope `{ text }`, запасное — `text` страницы). На ней `size` и
			`variant` страницы (их диктует пагинация, как табам набор),
			`disabled` и набор `aria`: `aria-current="page"` у текущей, его пишет
			расширение коллекции. Текущая — обычная, не выключенная кнопка: каждая
			страница — своя остановка Tab. Вида нет: `plain`, у текущей — заливку,
			и квадрат узкого номера даёт тема по контексту.

			Нажатие делает страницу текущей — активацией коллекции, как у таба;
			значение пагинации за ней пишет расширение коллекции. Нажатие по
			текущей ничего не меняет.
		-->
		<Button
			embedded="pagination.page"
			type="button"
			:disabled="disabled"
			:size="size"
			:variant="variant"
			@click="context && (context.adapters.activation.active = true)"
			v-bind="aria"
		>
			<slot :text="text">{{ text }}</slot>
		</Button>
	</component>
</template>
