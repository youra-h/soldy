<script setup lang="ts">
import AppHeader from './components/AppHeader.vue'
import AppSidebar from './components/AppSidebar.vue'
</script>

<template>
	<div class="pg">
		<AppHeader />
		<AppSidebar />
		<main class="pg__main">
			<RouterView />
		</main>
	</div>
</template>
