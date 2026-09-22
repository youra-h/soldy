<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { Select, Switch } from '@soldy-ui/vue'
import { useTheme } from '../composables/useTheme'
import { useIconPack } from '../composables/useIconPack'
import { propertiesRoute, TESTS_ROUTE } from '../router'

const { theme, dark, themes } = useTheme()
const { pack, packs, apply } = useIconPack()

const route = useRoute()

/**
 * Переход между страницей свойств и страницей тестов. Со страницы тестов —
 * обратно на ту страницу свойств, с которой ушли.
 */
const counterpart = computed(() =>
	route.path.startsWith(TESTS_ROUTE)
		? { to: propertiesRoute.value, label: 'Свойства' }
		: { to: TESTS_ROUTE, label: 'Тесты' },
)
</script>

<template>
	<header class="pg__header">
		<div class="pg__brand">soldy <span>· playground</span></div>
		<RouterLink :to="counterpart.to" class="pg__switch">{{ counterpart.label }}</RouterLink>

		<div class="pg__control">
			<span class="pg__control-label">Тема</span>
			<Select :value="theme" size="sm" @update:value="theme = String($event)">
				<Select.Item
					v-for="item in themes"
					:key="item.id"
					:value="item.value"
					:text="item.label"
				/>
			</Select>
		</div>

		<div class="pg__control">
			<span class="pg__control-label">Иконки</span>
			<Select :value="pack" size="sm" @update:value="apply(String($event))">
				<Select.Item
					v-for="item in packs"
					:key="item.id"
					:value="item.id"
					:text="item.label"
				/>
			</Select>
		</div>

		<div class="pg__control">
			<span class="pg__control-label">Тёмная</span>
			<Switch :value="dark" size="sm" @update:value="dark = Boolean($event)" />
		</div>
	</header>
</template>
