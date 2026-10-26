<script setup lang="ts">
import { Select } from '@soldy-ui/vue'
import { COLLECTION_ITEMS } from '../../../data'

defineOptions({ name: 'SoldySelectPage' })
</script>

<template>
	<Select placeholder="Выберите" editable :items="COLLECTION_ITEMS" />
</template>
