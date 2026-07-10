<script lang="ts">
import SetupComponent from './setup.component'

export default { ...SetupComponent }
</script>

<template>
	<component ref="rootRef" :is="tag" v-if="rendered" v-show="visible" :class="classes">
		<slot />
	</component>
</template>
