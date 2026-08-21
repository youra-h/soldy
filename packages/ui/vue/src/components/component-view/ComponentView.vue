<script lang="ts">
import SetupComponentView from './setup.component'

export default { ...SetupComponentView }
</script>

<template>
	<component ref="rootElement" :is="tag" v-if="rendered" v-show="visible" :class="_classes">
		<slot />
	</component>
</template>
