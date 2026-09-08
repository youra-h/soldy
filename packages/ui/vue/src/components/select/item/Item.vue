<script lang="ts">
import { Button } from '../../button'
import SetupSelectItem from './setup.component'

/**
 * Вся ARIA опции — на ней самой: `role="option"` от ядра, `id` и
 * `aria-selected` от расширения коллекции. Один набор, шаблону не нужно знать,
 * кто в него писал.
 *
 * `dataset` — то же состояние для темы (`data-selected`, `data-highlighted`),
 * тоже готовым набором: выбор пишет расширение выборки, подсветку —
 * `TListItemPlugin`. ARIA для скринридера, `data-*` для стилей; смешивать
 * нельзя, иначе правка доступности ломает вид.
 *
 * Выбранность и подсветка — разные вещи: подсветка живёт, только пока панель
 * открыта, и в значение не попадает.
 *
 * Пояснение в `<script>`, а не комментарием над корнем: в dev-режиме
 * компилятор SFC комментарии сохраняет, и такой комментарий сделал бы
 * компонент многокорневым — см. `Select.vue`.
 */
export default { ...SetupSelectItem, components: { Button } }
</script>

<template>
	<div
		ref="rootElement"
		v-if="rendered"
		v-show="visible"
		:class="classes"
		:dir="dir ?? undefined"
		:style="{ order: order }"
		@click="context.adapters.select.choose()"
		v-bind="{ ...aria, ...dataset, ...containerAttrs }"
	>
		<Button
			tag="span"
			view="none"
			:size="size"
			:variant="variant"
			:disabled="disabled"
			tabindex="-1"
			v-bind="controlAttrs"
		>
			<template #leading>
				<slot name="leading" />
			</template>

			<slot :text="text" :selected="selected">
				{{ text }}
			</slot>

			<template #trailing>
				<slot name="trailing" />
			</template>
		</Button>
	</div>
</template>
