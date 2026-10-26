<script setup lang="ts">
import { NSelect } from 'naive-ui'
import { COLLECTION_ITEMS } from '../../../data'

/** Select with typing and filtering — `filterable`, as the soldy `editable` preview. */
defineOptions({ name: 'NaiveSelectPage' })

const options = COLLECTION_ITEMS.map((item) => ({ label: item.text, value: item.value }))
</script>

<template>
	<NSelect :options="options" filterable placeholder="Выберите" style="width: 240px" />
</template>
