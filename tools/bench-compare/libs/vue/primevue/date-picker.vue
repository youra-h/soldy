<script setup lang="ts">
import { ref } from 'vue'
import DatePicker from 'primevue/datepicker'

defineOptions({ name: 'PrimeDatePickerPage' })

const value = ref()
</script>

<template>
	<DatePicker v-model="value" aria-label="Дата" />
</template>
