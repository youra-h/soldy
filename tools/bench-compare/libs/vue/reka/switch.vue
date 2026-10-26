<script setup lang="ts">
import { Label, SwitchRoot, SwitchThumb } from 'reka-ui'

/** A switch inside its label, unstyled. */
defineOptions({ name: 'RekaSwitchPage' })
</script>

<template>
	<Label style="display: inline-flex; gap: 8px; align-items: center">
		<SwitchRoot style="width: 32px; height: 18px; border: 1px solid">
			<SwitchThumb />
		</SwitchRoot>
		Включено
	</Label>
</template>
