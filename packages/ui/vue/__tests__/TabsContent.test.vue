<script setup lang="ts">
/** Тестовая обёртка: панели задаются компонентами в слоте `content`. */
import { Tabs, TabsItem, TabsContent } from '@soldy/ui-vue'
</script>

<template>
	<Tabs>
		<TabsItem value="a" text="First" active />
		<TabsItem value="b" text="Second" />

		<template #content>
			<TabsContent value="a">Панель A</TabsContent>
			<TabsContent value="b">Панель B</TabsContent>
		</template>
	</Tabs>
</template>
