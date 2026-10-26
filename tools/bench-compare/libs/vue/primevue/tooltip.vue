<script setup lang="ts">
import Button from 'primevue/button'

/** PrimeVue's tooltip is a directive; by default it opens on hover, not on focus. */
defineOptions({ name: 'PrimeTooltipPage' })
</script>

<template>
	<Button v-tooltip="'Короткое пояснение к кнопке'" label="Наведи" />
</template>
