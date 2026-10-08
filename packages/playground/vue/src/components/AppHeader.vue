<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { Select, Switch } from '@soldy-ui/vue'
import { useTheme } from '../composables/useTheme'
import { useIconPack } from '../composables/useIconPack'
import { useLanguage } from '../composables/useLanguage'
import { useMotionMode, type TMotionOffReason } from '../composables/useMotionMode'
import { propertiesRoute, TESTS_ROUTE } from '../router'

const { theme, dark, themes } = useTheme()
const { pack, packs, apply } = useIconPack()
const { mode, modes, offReason, choose } = useMotionMode()
const { language, languages, choose: chooseLanguage } = useLanguage()

/** Чем выключено движение — в плашке шапки. */
const OFF_REASONS: Record<TMotionOffReason, string> = {
	system: 'так просит система',
	stand: 'режимом стенда',
}

/**
 * Плашка, пока движение выключено: пропавшая анимация иначе выглядит поломкой
 * компонента. Тот же текст — в `title`: в тесной шапке плашка режет его
 * многоточием.
 */
const motionOff = computed(
	() =>
		offReason.value &&
		`Движение выключено — ${OFF_REASONS[offReason.value]}. «${modes.full}» вернёт его`,
)

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

		<p v-if="motionOff" class="pg__motion-off" :title="motionOff">{{ motionOff }}</p>

		<div class="pg__control">
			<span class="pg__control-label">Анимация движения</span>
			<Select :value="mode" size="sm" @update:value="choose($event)">
				<Select.Item
					v-for="(label, value) in modes"
					:key="value"
					:value="value"
					:text="label"
				/>
			</Select>
		</div>

		<div class="pg__control">
			<span class="pg__control-label">Язык</span>
			<Select :value="language" size="sm" @update:value="chooseLanguage($event)">
				<Select.Item
					v-for="(entry, value) in languages"
					:key="value"
					:value="value"
					:text="entry.label"
				/>
			</Select>
		</div>

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
