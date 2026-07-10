<script lang="ts">
import SetupFrame from './setup.component'

export default { ...SetupFrame }
</script>

<template>
	<teleport :to="target">
		<div ref="rootRef" v-show="visible" v-if="rendered" :style="styles" class="s-frame">
			<slot />
		</div>
	</teleport>
</template>
