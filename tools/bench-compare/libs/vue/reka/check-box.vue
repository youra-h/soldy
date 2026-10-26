<script setup lang="ts">
import { CheckboxIndicator, CheckboxRoot, Label } from 'reka-ui'

/** A checkbox inside its label, unstyled. */
defineOptions({ name: 'RekaCheckBoxPage' })
</script>

<template>
	<Label style="display: inline-flex; gap: 8px; align-items: center">
		<CheckboxRoot style="width: 16px; height: 16px; border: 1px solid">
			<CheckboxIndicator>✓</CheckboxIndicator>
		</CheckboxRoot>
		Согласен
	</Label>
</template>
