<script lang="ts">
import SetupLabel from './setup.component'

export default { ...SetupLabel }
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
			Подпись контрола. Корень рисуется по `tag`, по умолчанию `label`.
			Модификаторы `s-label--position-*`, `s-label--size-*` и
			`s-label--variant-*` — на корне: тема читает всё отсюда.

			Связки через `for` и `id` нет: контрол — первый labelable-потомок
			`label`, поэтому клик по тексту переключает его, а текст становится
			его доступным именем. Внутри — только `span`: `div` и вложенный
			`label` HTML здесь запрещает, а описание или ошибка вошли бы в имя.

			Порядок в DOM один на все стороны: контрол, потом текст. Сторону
			рисует тема.

			Комментарий — внутри корня, а не над ним: в разработке Vue
			оставляет комментарии, и корнем стал бы фрагмент.
		-->
		<!--
			Контрол — слот `default`: CheckBox, Switch или RadioGroup.Item с
			`tag="span"` (его корень — `label`, а `label` в `label` запрещён;
			забытый тег ловит плагин подписи). Обёртка выравнивает контрол по
			первой строке текста.
		-->
		<span class="s-label__control"><slot /></span>
		<!--
			Текст — слот `content`, запасное содержимое — проп `text`. Вокруг
			слота и запасного текста нет пробелов: пустую обёртку тема прячет
			по `:empty`.
		-->
		<span class="s-label__text"
			><slot name="content">{{ text }}</slot></span
		>
	</component>
</template>
