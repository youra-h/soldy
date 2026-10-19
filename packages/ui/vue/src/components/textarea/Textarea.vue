<script lang="ts">
import SetupTextarea from './setup.component'

export default { ...SetupTextarea }
</script>

<template>
	<component
		ref="rootElement"
		:is="tag"
		v-if="rendered"
		v-show="visible"
		:class="classes"
		v-bind="{ ...attrs, ...dataset, ...containerAttrs }"
	>
		<!--
			Корень рисуется по `tag`, по умолчанию `div`, как у Input: `tag` —
			всегда тег корня. На корне — модификаторы (`--size-*`, `--variant-*`,
			`--readonly`, `--required`) и `dataset`: `data-disabled`,
			`data-invalid` и `data-limit` (`reached` — набрано ровно
			`maxlength`, `exceeded` — больше). Тема красит рамку и счётчик по
			корню, а `aria` — у вложенной `<textarea>`.
		-->
		<!--
			Поле без класса, как `<input>` у Input. Нативные атрибуты — `id`,
			`name`, `rows`, `maxlength`, `disabled`, `readonly`, `required`,
			`placeholder`; `aria` и атрибуты потребителя — сюда же. Высоту
			тема не задаёт: её ведут `rows`, ручка и плагин автороста —
			инлайновой `height` на этом узле.
		-->
		<textarea
			:id="id"
			:value="value"
			:name="name"
			:rows="rows"
			:maxlength="maxlength"
			:disabled="disabled"
			:readonly="readonly"
			:required="required"
			:placeholder="placeholder"
			v-bind="{ ...aria, ...controlAttrs }"
		></textarea>
		<!--
			Счётчик символов — только при `counter`. Стоит в рамке, под полем:
			подсказка и ошибка `Field` встают под всем компонентом. Текст —
			набрано и предел (`12 / 200`), без `maxlength` — одно число (`12`);
			его пишет плагин имён по локали поддерева.
		-->
		<div v-if="counter" class="so-textarea__counter">{{ names_counter }}</div>
	</component>
</template>
