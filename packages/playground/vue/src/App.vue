<script setup lang="ts">
import { Drawer, LocaleProvider } from '@soldy-ui/vue'
import AppHeader from './components/AppHeader.vue'
import { useLanguage } from './composables/useLanguage'
import { useSidebar } from './composables/useSidebar'

const { locale } = useLanguage()
const { narrow, open } = useSidebar()
</script>

<template>
	<LocaleProvider :locale="locale">
		<!--
			Локаль библиотеки — выбранный в шапке язык: провайдер вокруг оболочки.
			Превью рисуют хосты фреймворков в своих корнях, и язык им отдаёт
			загрузчик хостов — контекст провайдера в чужой корень не проходит
		-->
		<div class="pg" :class="{ 'pg--narrow': narrow }">
			<AppHeader />
			<!--
				Левая панель своя у каждой страницы: меню компонентов или тем.
				В узком окне она уезжает в выезжающую панель — открывает её
				кнопка меню в шапке
			-->
			<Drawer v-if="narrow" v-model:visible="open" placement="start" class="pg__drawer">
				<template #title>Меню</template>
				<RouterView name="sidebar" />
			</Drawer>
			<RouterView v-else name="sidebar" />
			<main class="pg__main">
				<RouterView />
			</main>
		</div>
	</LocaleProvider>
</template>
