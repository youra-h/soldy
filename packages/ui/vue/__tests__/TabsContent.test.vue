<script setup lang="ts">
/** Тестовая обёртка: панели задаются компонентами в слоте `content`. */
import { Tabs, TabItem, TabsContent } from '@soldy/ui-vue'
</script>

<template>
	<Tabs>
		<TabItem value="a" text="First" active />
		<TabItem value="b" text="Second" />

		<template #content>
			<TabsContent value="a">Панель A</TabsContent>
			<TabsContent value="b">Панель B</TabsContent>
		</template>
	</Tabs>
</template>
