<script lang="ts">
import SetupMenuGroup from './setup.component'

export default { ...SetupMenuGroup }
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
			Пункты под общей подписью: `role="group"` и `aria-labelledby` на
			подпись — имя группы. Пункты в коллекцию меню входят сквозь группу:
			навигация ходит по ним, как по одному списку.

			Подпись — текст `label` группы; нет подписи — нет и обёртки, и
			ссылки на неё у группы тоже нет. `id` подписи — в её наборе
			(`labelAria`): подпись — разметка без своего экземпляра.
		-->
		<div v-if="label" class="so-menu-group__label" v-bind="labelAria">{{ label }}</div>

		<slot />
	</component>
</template>
