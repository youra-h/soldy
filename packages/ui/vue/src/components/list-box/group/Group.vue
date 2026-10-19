<script lang="ts">
import SetupListBoxGroup from './setup.component'

export default { ...SetupListBoxGroup }
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
			Элементы под общей подписью: `role="group"` и `aria-labelledby` на
			подпись — имя группы. Элементы входят в коллекцию списка сквозь
			группу: навигация ходит по ним, как по одному списку.

			Подпись — текст `label` группы; нет подписи — нет и обёртки, и
			ссылки на неё у группы тоже нет. Набор подписи (`labelAria`) — её
			`id` и роль `presentation`: в `listbox` ARIA пускает только опции и
			группы.
		-->
		<div v-if="label" class="so-list-box-group__label" v-bind="labelAria">{{ label }}</div>

		<slot />
	</component>
</template>
