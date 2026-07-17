<script lang="ts">
import SetupComponentView from './setup.component'

export default { ...SetupComponentView }
</script>

<template>
	{{ console.log(visible, rendered, tag, classes) }}
	<component ref="rootElement" :is="tag" v-if="rendered" v-show="visible" :class="classes">
		<slot />
	</component>
</template>
