<script setup lang="ts">
type Props = {
	title?: string
	info?: string
}

defineProps<Props>()
</script>

<template>
	<div class="panel-demo">
		<h3 v-if="title" class="panel-demo__title">{{ title }}</h3>
		<div class="panel-demo__content">
			<slot />
		</div>
		<div v-if="info" class="panel-demo__info">{{ info }}</div>
	</div>
</template>
