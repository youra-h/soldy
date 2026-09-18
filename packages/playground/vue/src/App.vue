<script setup lang="ts">
import AppHeader from './components/AppHeader.vue'
</script>

<template>
	<div class="pg">
		<AppHeader />
		<!-- Левая панель своя у каждой страницы: меню компонентов или тем -->
		<RouterView name="sidebar" />
		<main class="pg__main">
			<RouterView />
		</main>
	</div>
</template>
