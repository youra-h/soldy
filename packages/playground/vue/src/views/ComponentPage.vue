<script setup lang="ts">
import { computed } from 'vue'
import { NON_EDITABLE, propControl } from '@soldy/playground-shared'
import { findAvailable } from '../catalog'
import PropRow from '../components/PropRow.vue'
import { useEvents } from '../composables/useEvents'
import { useIconPack } from '../composables/useIconPack'

const props = defineProps<{ id: string }>()

const { version } = useIconPack()

const entry = computed(() => findAvailable(props.id))

const descriptor = computed(() => entry.value?.descriptor())

/**
 * Значения по умолчанию берутся со статики core-класса, а не из декларации:
 * в `IPropDeclaration` поля `default` нет вовсе — так же их достаёт и сам
 * адаптер (`useProps`).
 */
const defaults = computed<Record<string, unknown>>(
	() =>
		(descriptor.value?.ctor as { defaultValues?: Record<string, unknown> })?.defaultValues ??
		{},
)

/**
 * Редактируемые пропы: собственные плюс унаследованные, без `protected`.
 *
 * `protected` — это вычисляемые наружу значения (`classes`, `aria`, `dataset`,
 * `present`): аксессор их не пишет вовсе, контрол для них был бы обманом.
 * `ctrl` исключён отдельно — это не свойство, а способ отдать компоненту
 * готовый экземпляр, чем вторая колонка и пользуется.
 */
const controls = computed(() => {
	const current = entry.value

	if (!current || !descriptor.value) return []

	return descriptor.value.props
		.filter((prop) => !prop.protected && !NON_EDITABLE.has(prop.name.name))
		.map((prop) => propControl(current.id, prop, defaults.value))
})

const handlers = computed(() => (descriptor.value ? useEvents(descriptor.value) : () => ({})))
</script>

<template>
	<template v-if="entry">
		<h1 class="pg__page-title">{{ entry.label }}</h1>
		<p class="pg__page-lead">
			{{ entry.description }} · события идут в консоль браузера с пометкой источника
		</p>

		<!--
			Ключ с идентификатором компонента, а не одно имя пропа.

			Маршрут `/component/:id` обслуживает один экземпляр страницы: при
			переходе меняется только `id`. Имена пропов у компонентов
			пересекаются (`size`, `disabled`, `variant` есть почти у всех), и по
			одному имени Vue считал строку той же самой — переиспользовал её со
			всем, что она завела в `setup`. В правой колонке оставался `ctrl`
			прежнего компонента: ListBox рисовался с корнем от Button.
		-->
		<PropRow
			v-for="control in controls"
			:key="`${entry.id}:${control.name}`"
			:entry="entry"
			:control="control"
			:tag="handlers"
			:icon-version="version"
		/>
	</template>

	<p v-else class="pg-empty">Компонент «{{ id }}» не найден.</p>
</template>
