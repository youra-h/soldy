<script setup lang="ts">
import { Select, Switch } from '@soldy/ui-vue'
import { useTheme } from '../composables/useTheme'
import { useIconPack } from '../composables/useIconPack'

const { theme, dark, themes } = useTheme()
const { pack, packs, apply } = useIconPack()
</script>

<template>
	<header class="pg__header">
		<div class="pg__brand">soldy <span>· playground</span></div>

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
