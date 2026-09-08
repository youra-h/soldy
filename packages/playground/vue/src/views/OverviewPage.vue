<script setup lang="ts">
import { SHOWCASE } from '../catalog'
import { PREVIEW_COMPONENTS } from '../previews'
import { useIconPack } from '../composables/useIconPack'

const { version } = useIconPack()
</script>

<template>
	<h1 class="pg__page-title">Компоненты</h1>
	<p class="pg__page-lead">
		Всё, что готово: ядро, обёртка Vue и стили темы. Клик по ячейке открывает страницу со
		свойствами и событиями.
	</p>

	<div class="pg-grid">
		<RouterLink
			v-for="entry in SHOWCASE"
			:key="entry.id"
			:to="`/component/${entry.id}`"
			class="pg-cell"
			:class="{ 'pg-cell--wide': entry.span === 2 }"
		>
			<div class="pg-cell__title">{{ entry.label }}</div>
			<div class="pg-cell__stage">
				<component :is="PREVIEW_COMPONENTS[entry.id]" :key="version" />
			</div>
			<div class="pg-cell__note">{{ entry.description }}</div>
		</RouterLink>
	</div>
</template>
