<script lang="ts">
import SetupComponentView from './setup.component'

export default { ...SetupComponentView }
</script>

<template>
	<component ref="rootRef" :is="tag" v-if="rendered" v-show="visible" :class="classes">
		<slot />
	</component>
</template>
