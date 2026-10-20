<script lang="ts">
import SetupMenuRadioGroup from './setup.component'

export default { ...SetupMenuRadioGroup }
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
			Разметка — как у группы меню (`Group.vue`): переключатели под общей
			подписью, `role="group"` и `aria-labelledby` на подпись — имя группы.
			Роли `radiogroup` нет: в меню группа переключателей — `group` (APG).
			Переключатели входят в коллекцию меню сквозь группу: навигация ходит
			по ним, как по одному списку.

			Подпись — текст `label` группы; нет подписи — нет и обёртки, и
			ссылки на неё у группы тоже нет. `id` подписи — в её наборе
			(`labelAria`): подпись — разметка без своего экземпляра.
		-->
		<div v-if="label" class="so-menu-group__label" v-bind="labelAria">{{ label }}</div>

		<slot />
	</component>
</template>
