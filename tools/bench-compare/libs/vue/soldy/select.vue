<script setup lang="ts">
import { Select } from '@soldy-ui/vue'
import { COLLECTION_ITEMS } from '../../../data'

defineOptions({ name: 'SoldySelectPage' })
</script>

<template>
	<Select placeholder="Выберите" editable>
		<Select.Item v-for="item in COLLECTION_ITEMS" :key="item.value" v-bind="item" />
	</Select>
</template>
