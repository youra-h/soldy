<script lang="ts">
import SetupFrame from './setup.component'

export default { ...SetupFrame }
</script>

<template>
	<teleport :to="target">
		<component
			ref="rootElement"
			:is="tag"
			v-if="rendered"
			v-show="visible"
			:class="classes"
			:dir="dir ?? undefined"
			:style="layout_styles"
			v-bind="aria"
		>
			<slot />
		</component>
	</teleport>
</template>
