<script lang="ts">
import SetupIcon from './setup.component'

export default { ...SetupIcon }
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
	</component>
</template>
