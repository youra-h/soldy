<script lang="ts">
import { Icon } from '../../icon'
import { Button } from '../../button'
import SetupSelectItem from './setup.component'

/**
 * Вся ARIA опции — на вложенном `Button`, строке опции: `role="option"` от
 * ядра, `id` и `aria-selected` от расширения коллекции. Один набор, шаблону не
 * нужно знать, кто в него писал. Узел с ролью один, как у Tabs, Accordion,
 * ListBox и Tags: набор опции ложится поверх того, что `Button` пишет себе
 * сам, — `role="option"` перекрывает `role="button"`, `tabindex="-1"` выводит
 * строку из обхода (фокус остаётся на поле), а `aria-disabled` у них один и
 * тот же.
 *
 * Тег строки фиксирован (`tag="span"`), а не берётся из `tag` элемента:
 * `tag` — тег корня (`TComponentView`), и рисует по нему корень
 * `<component :is>`. Под фиксированный тег строки написан и
 * `TSelectItem._ariaTag` — он решает, писать ли `aria-disabled`.
 *
 * `dataset` — то же состояние для темы (`data-selected`, `data-highlighted`),
 * тоже готовым набором: выбор пишет расширение выборки, подсветку —
 * `TListItemPlugin`. ARIA для скринридера, `data-*` для стилей; смешивать
 * нельзя, иначе правка доступности ломает вид.
 *
 * `dataset` биндится дважды — на обёртку и на `Button`: фон при hover/
 * подсветке/выборе тема рисует на самой кнопке и читает `data-highlighted` /
 * `data-selected` с неё. То же устройство, что у `ListBoxItem`.
 *
 * Вида у строки в разметке нет: значения вида объявляет тема, и библиотека их
 * не знает. Строку опции тема красит по контексту (`.s-select-item`).
 *
 * Выбранность и подсветка — разные вещи: подсветка живёт, только пока панель
 * открыта, и в значение не попадает.
 *
 * Пояснение в `<script>`, а не комментарием над корнем: в dev-режиме
 * компилятор SFC комментарии сохраняет, и такой комментарий сделал бы
 * компонент многокорневым — см. `Select.vue`.
 *
 * Отметка выбранного (`indicator`) рисуется внутри слотов кнопки: обёртка
 * стоит, пока сторона задана, — она резервирует место, чтобы строка не прыгала
 * при выборе; иконка внутри появляется только у выбранной опции. Обёртка
 * `aria-hidden`: состояние скринридеру объявляет `aria-selected`.
 */
export default { ...SetupSelectItem, components: { Icon, Button } }
</script>

<template>
	<component
		ref="rootElement"
		:is="tag"
		v-if="rendered"
		v-show="visible"
		:class="classes"
		:style="{ order: order }"
		@click="context?.adapters.select.choose()"
		v-bind="{ ...dataset, ...containerAttrs, ...attrs }"
	>
		<Button
			tag="span"
			:size="size"
			:variant="variant"
			:disabled="disabled"
			tabindex="-1"
			v-bind="{ ...aria, ...dataset, ...controlAttrs }"
		>
			<template #leading>
				<span
					v-if="indicator === 'start'"
					class="s-select-item__indicator"
					aria-hidden="true"
				>
					<slot name="indicator-icon" :selected="selected">
						<Icon v-if="selected" :tag="indicatorIconTag" :size="size" />
					</slot>
				</span>
				<slot name="leading" />
			</template>

			<slot :text="text" :selected="selected">
				{{ text }}
			</slot>

			<template #trailing>
				<slot name="trailing" />
				<span
					v-if="indicator === 'end'"
					class="s-select-item__indicator"
					aria-hidden="true"
				>
					<slot name="indicator-icon" :selected="selected">
						<Icon v-if="selected" :tag="indicatorIconTag" :size="size" />
					</slot>
				</span>
			</template>
		</Button>
	</component>
</template>
