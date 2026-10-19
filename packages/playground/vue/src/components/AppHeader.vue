<script setup lang="ts">
import { Button, Drawer, Icon } from '@soldy-ui/vue'
import { useSidebar } from '../composables/useSidebar'
import { MENU_GLYPH, SETTINGS_GLYPH } from '../icons'
import AppSettings from './AppSettings.vue'
import PageSwitch from './PageSwitch.vue'

const { narrow, menuOpen, settingsOpen } = useSidebar()
</script>

<template>
	<header class="pg__header" :class="{ 'pg__header--narrow': narrow }">
		<!--
			Узкое окно — шапка полоской в одну строку: меню, название, настройки.
			Меню и настройки уезжают в выезжающие панели, открывают их кнопки с
			глифами (`icons.ts`). Глиф декоративный — имя кнопке даёт `aria_label`
		-->
		<Button
			v-if="narrow"
			size="sm"
			view="plain"
			type="button"
			class="pg__glyph-button"
			aria_label="Меню"
			@click="menuOpen = true"
		>
			<Icon :tag="MENU_GLYPH" />
		</Button>

		<div class="pg__brand">soldy-ui <span>· playground</span></div>

		<template v-if="narrow">
			<Button
				size="sm"
				view="plain"
				type="button"
				class="pg__glyph-button"
				aria_label="Настройки"
				@click="settingsOpen = true"
			>
				<Icon :tag="SETTINGS_GLYPH" />
			</Button>

			<!--
				Закрытая панель спрятана, а не размонтирована, и настройки в ней
				действуют, пока она закрыта: тему и режим движения странице ставят
				они (`useTheme`, `useMotionMode`). Смена адреса панель не закрывает
				(`useSidebar`)
			-->
			<Drawer v-model:visible="settingsOpen" placement="end" class="pg__drawer">
				<template #title>Настройки</template>
				<AppSettings />
			</Drawer>
		</template>

		<!-- Широкое окно: ссылка сразу за названием, контролы — до конца шапки -->
		<template v-else>
			<PageSwitch />
			<AppSettings />
		</template>
	</header>
</template>
