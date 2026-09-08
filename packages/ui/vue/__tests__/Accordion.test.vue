<script setup lang="ts">
/** Тестовая обёртка: точка резолвится только компилятором SFC. */
import { Accordion } from '@soldy/ui-vue'
</script>

<template>
	<Accordion mode="multiple">
		<Accordion.Item text="Первый" value="a" :selected="true">
			<p>Содержимое A</p>
		</Accordion.Item>
		<Accordion.Item text="Второй" value="b">
			<p>Содержимое B</p>
		</Accordion.Item>
	</Accordion>
</template>
