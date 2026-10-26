<script setup lang="ts">
import { VDateInput } from 'vuetify/components/VDateInput'

/** A date field with a calendar in a popup — `VDateInput`. */
defineOptions({ name: 'VuetifyDatePickerPage' })
</script>

<template>
	<VDateInput label="Дата" style="width: 280px" />
</template>
