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
		:style="layout_styles"
	>
		<slot />
	</component>
</template>
