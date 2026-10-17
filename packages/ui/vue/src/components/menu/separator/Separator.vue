<script lang="ts">
import SetupMenuSeparator from './setup.component'

export default { ...SetupMenuSeparator }
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
			Линия между группами пунктов: `role="separator"` от ядра. Навигация
			её пропускает — в коллекцию меню разделитель не входит. Внутри
			ничего не рисуется.
		-->
	</component>
</template>
