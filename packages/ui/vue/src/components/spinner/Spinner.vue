<script lang="ts">
import SetupSpinner from './setup.component'

export default { ...SetupSpinner }
</script>

<template>
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
</template>
