<script setup lang="ts">
import { NSwitch } from 'naive-ui'

/** `NSwitch` has no label of its own: the text stands next to it, as in the Naive docs. */
defineOptions({ name: 'NaiveSwitchPage' })
</script>

<template>
	<label style="display: inline-flex; gap: 8px; align-items: center">
		<NSwitch />
		Включено
	</label>
</template>
