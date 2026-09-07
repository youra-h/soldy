<script lang="ts">
import SetupSkeleton from './setup.component'

export default { ...SetupSkeleton }
</script>

<template>
	<component
		ref="rootElement"
		:is="tag"
		:class="classes"
		:dir="dir ?? undefined"
		:style="layout_styles"
		v-bind="aria"
	>
		<!--
			Заглушка декоративна: она изображает будущий текст, а не является им.
			`aria-hidden` стоит на ней, а не на корне — в корне лежит слот с
			настоящим содержимым, и скрывать его нельзя.
		-->
		<div class="s-skeleton__placeholder" v-if="present" aria-hidden="true" />
		<slot />
	</component>
</template>
