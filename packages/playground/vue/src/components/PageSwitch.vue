<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { frameworkOf, isTestsRoute, propertiesPath } from '../navigation'

const route = useRoute()

/** Фреймворк превью — первый сегмент адреса. */
const framework = computed(() => frameworkOf(route))

/**
 * Переход между страницей свойств и страницей тестов — в пределах
 * фреймворка. Со страницы тестов — обратно на ту страницу свойств, с которой
 * ушли.
 *
 * Ссылка — навигация, а не настройка: в широком окне она в шапке, сразу за
 * названием, в узком — в панели меню, над списком (`App.vue`).
 */
const counterpart = computed(() =>
	isTestsRoute(route)
		? { to: propertiesPath(framework.value), label: 'Свойства' }
		: { to: `/${framework.value}/tests`, label: 'Тесты' },
)
</script>

<template>
	<RouterLink :to="counterpart.to" class="pg__switch">{{ counterpart.label }}</RouterLink>
</template>
