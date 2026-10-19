<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { Drawer, LocaleProvider } from '@soldy-ui/vue'
import AppHeader from './components/AppHeader.vue'
import PageSwitch from './components/PageSwitch.vue'
import { useLanguage } from './composables/useLanguage'
import { useSidebar } from './composables/useSidebar'

const { locale } = useLanguage()
const { narrow, menuOpen } = useSidebar()

/**
 * Высота шапки — меню прилипает под ней (`--pg-header-height`, styles.css,
 * «Каркас»). В окне между узким и широким шапка переносит контролы на вторую
 * строку, поэтому высоту меряем, а не задаём. В узком окне шапка — полоска в
 * одну строку, а меню в выезжающей панели.
 */
const shell = ref<HTMLElement | null>(null)
let headerObserver: ResizeObserver | null = null

onMounted(() => {
	const root = shell.value
	const header = root?.querySelector('.pg__header')

	if (!root || !header) return

	headerObserver = new ResizeObserver(() => {
		root.style.setProperty('--pg-header-height', `${header.getBoundingClientRect().height}px`)
	})
	headerObserver.observe(header, { box: 'border-box' })
})

onBeforeUnmount(() => headerObserver?.disconnect())
</script>

<template>
	<LocaleProvider :locale="locale">
		<!--
			Локаль библиотеки — выбранный в шапке язык: провайдер вокруг оболочки.
			Превью рисуют хосты фреймворков в своих корнях, и язык им отдаёт
			загрузчик хостов — контекст провайдера в чужой корень не проходит
		-->
		<div ref="shell" class="pg" :class="{ 'pg--narrow': narrow }">
			<AppHeader />
			<!--
				Левая панель своя у каждой страницы: меню компонентов или тем.
				В узком окне она уезжает в выезжающую панель — открывает её
				кнопка меню в шапке. Над меню в панели — ссылка между свойствами
				и тестами: это навигация, и из шапки она уходит сюда, а не в
				настройки
			-->
			<Drawer v-if="narrow" v-model:visible="menuOpen" placement="start" class="pg__drawer">
				<template #title>Меню</template>
				<PageSwitch />
				<RouterView name="sidebar" />
			</Drawer>
			<RouterView v-else name="sidebar" />
			<main class="pg__main">
				<RouterView />
			</main>
		</div>
	</LocaleProvider>
</template>
