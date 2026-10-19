<script lang="ts">
import SetupSelectGroup from './setup.component'

export default { ...SetupSelectGroup }
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
			Опции под общей подписью: `role="group"` и `aria-labelledby` на
			подпись — имя группы. Опции входят в коллекцию Select сквозь группу:
			подсветка стрелками ходит по ним, как по одному списку.

			Подпись — текст `label` группы; нет подписи — нет и обёртки, и
			ссылки на неё у группы тоже нет. Набор подписи (`labelAria`) — её
			`id` и роль `presentation`: список панели — `listbox`, а в нём ARIA
			пускает только опции и группы.
		-->
		<div v-if="label" class="so-select-group__label" v-bind="labelAria">{{ label }}</div>

		<slot />
	</component>
</template>
