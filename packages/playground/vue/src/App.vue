<script setup lang="ts">
import { LocaleProvider } from '@soldy-ui/vue'
import AppHeader from './components/AppHeader.vue'
import { useLanguage } from './composables/useLanguage'

const { locale } = useLanguage()
</script>

<template>
	<LocaleProvider :locale="locale">
		<!--
			Локаль библиотеки — выбранный в шапке язык: провайдер вокруг оболочки.
			Превью рисуют хосты фреймворков в своих корнях, и язык им отдаёт
			загрузчик хостов — контекст провайдера в чужой корень не проходит
		-->
		<div class="pg">
			<AppHeader />
			<!-- Левая панель своя у каждой страницы: меню компонентов или тем -->
			<RouterView name="sidebar" />
			<main class="pg__main">
				<RouterView />
			</main>
		</div>
	</LocaleProvider>
</template>
