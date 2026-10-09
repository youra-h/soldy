<script setup lang="ts">
import { computed } from 'vue'
import { showcaseOf } from '../catalog'
import { frameworkLabel, hostOf } from '../hosts'
import PreviewStage from '../components/PreviewStage.vue'

const props = defineProps<{ framework: string }>()

/** Хост фреймворка из адреса — его загрузил роутер до входа на страницу. */
const host = computed(() => hostOf(props.framework))

const showcase = computed(() => showcaseOf(host.value))

/** Превью витрины — без пропов: компонент таким, каким его рисует превью. */
const NO_PROPS: Readonly<Record<string, unknown>> = Object.freeze({})
</script>

<template>
	<h1 class="pg__page-title">Компоненты</h1>
	<p class="pg__page-lead">
		Всё, что готово: ядро, обёртка {{ frameworkLabel(framework) }} и стили темы. Клик по ячейке
		открывает страницу со свойствами и событиями.
	</p>

	<div class="pg-grid">
		<RouterLink
			v-for="entry in showcase"
			:key="entry.id"
			:to="`/${framework}/${entry.id}`"
			class="pg-cell"
			:class="{ 'pg-cell--wide': entry.span === 2 }"
		>
			<div class="pg-cell__title">{{ entry.label }}</div>
			<div class="pg-cell__stage">
				<PreviewStage :host="host" :component="entry.id" :bind="NO_PROPS" />
			</div>
			<div class="pg-cell__note">{{ entry.description }}</div>
		</RouterLink>
	</div>
</template>
