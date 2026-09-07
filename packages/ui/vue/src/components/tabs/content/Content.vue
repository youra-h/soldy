<script lang="ts">
import SetupTabsContent from './setup.component'

export default { ...SetupTabsContent }
</script>

<!--
	Панель таба. Показывается, когда активен связанный по `value` таб.

	`rendered` остаётся за потребителем — он может выключить панель совсем;
	`active` решает лишь то, показана ли она сейчас. Раньше эту роль играл
	динамический слот `panel:${value}`, который резолвил только Vue.
-->
<template>
	<component
		ref="rootElement"
		:is="tag"
		v-if="rendered && active"
		v-show="visible"
		:class="classes"
		:dir="dir ?? undefined"
		v-bind="content_aria"
	>
		<slot />
	</component>
</template>
