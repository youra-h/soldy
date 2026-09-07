<script setup lang="ts">
/** Тестовая обёртка: точка резолвится только компилятором SFC. */
import { Collapse } from '@soldy/ui-vue'
</script>

<template>
	<Collapse mode="multiple">
		<Collapse.Item text="Первый" value="a" :selected="true">
			<p>Содержимое A</p>
		</Collapse.Item>
		<Collapse.Item text="Второй" value="b">
			<p>Содержимое B</p>
		</Collapse.Item>
	</Collapse>
</template>
