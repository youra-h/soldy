<script lang="ts">
import SetupSkeleton from './setup.component'

export default { ...SetupSkeleton }
</script>

<template>
	<component ref="rootElement" :is="tag" :class="classes" :style="layout_styles">
		<div class="s-skeleton__placeholder" v-if="present" />
		<slot />
	</component>
</template>
