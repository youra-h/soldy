<script setup lang="ts">
import { computed } from 'vue'
import { findComponent, propControls, type TPreviewEventSink } from '@soldy-ui/playground-shared'
import { findAvailable } from '../catalog'
import { frameworkLabel, hostOf } from '../hosts'
import PropRow from '../components/PropRow.vue'

const props = defineProps<{ framework: string; id: string }>()

/** Хост фреймворка из адреса — его загрузил роутер до входа на страницу. */
const host = computed(() => hostOf(props.framework))

const entry = computed(() => findAvailable(host.value, props.id))

/** Компонент есть в библиотеке, но не у этого фреймворка. */
const elsewhere = computed(() => (entry.value ? undefined : findComponent(props.id)))

/**
 * Свойства разведены по владельцу, а не свалены в один список.
 *
 * Так устроена и сама библиотека: у свойства свой владелец — `size` у
 * компонента, `mode` у фасада коллекции, `anchor_placement` у плагина. Один
 * список это различие прятал, и `mode` вообще не показывался: страница
 * строилась только из компонентного дескриптора.
 *
 * Какие пропы получают строку и в каком порядке, решает `propControls`: по тем
 * же группам строки считают проверка манифеста и дымовой тест.
 */
const groups = computed(() => (entry.value ? propControls(entry.value) : null))

/** События колонки — в консоль, с её пометкой. */
function sink(column: 'props' | 'instance'): TPreviewEventSink {
	return (name, args) => console.log(`[${column}] ${name}`, ...args)
}
</script>

<template>
	<template v-if="entry && groups">
		<h1 class="pg__page-title">{{ entry.label }}</h1>
		<p class="pg__page-lead">
			{{ entry.description }} · события идут в консоль браузера с пометкой источника
		</p>

		<!--
			Ключ с идентификатором компонента, а не одно имя пропа.

			Маршрут `/:framework/:id` обслуживает один экземпляр страницы: при
			переходе меняется только `id`. Имена пропов у компонентов
			пересекаются (`size`, `disabled`, `variant` есть почти у всех), и по
			одному имени Vue считал строку той же самой — переиспользовал её со
			всем, что она завела в `setup`. В правой колонке оставался `ctrl`
			прежнего компонента: ListBox рисовался с корнем от Button.

			Фреймворка в ключе нет: строка держит значение, экземпляр и движок,
			и при смене фреймворка остаётся — заново рисуется только сцена.
		-->
		<h2 class="pg__group">Свойства компонента</h2>

		<PropRow
			v-for="control in groups.componentControls"
			:key="`${entry.id}:${control.name}`"
			:entry="entry"
			:control="control"
			:host="host"
			:sink="sink"
		/>

		<!--
			Коллекционные — отдельной группой, а не вперемешку.

			`mode` живёт не на компоненте, а на фасаде коллекции, и через
			экземпляр пишется иначе. Смешать их в один список значит спрятать
			ровно то различие, которым устроена библиотека.
		-->
		<template v-if="groups.collectionControls.length">
			<h2 class="pg__group">Свойства коллекции</h2>

			<PropRow
				v-for="control in groups.collectionControls"
				:key="`${entry.id}:collection:${control.name}`"
				:entry="entry"
				:control="control"
				:host="host"
				:sink="sink"
			/>
		</template>

		<!--
			Плагинные — третьей группой по той же причине.

			Проп плагина живёт не на компоненте: со стороны экземпляра до него
			добираются через bundle, который адаптер отдаёт событием
			`bundle:create`. Имя строки — с неймспейсом, как проп пишут в
			разметке.
		-->
		<template v-if="groups.pluginControls.length">
			<h2 class="pg__group">Свойства плагинов</h2>

			<PropRow
				v-for="control in groups.pluginControls"
				:key="`${entry.id}:plugin:${control.name}`"
				:entry="entry"
				:control="control"
				:host="host"
				:sink="sink"
			/>
		</template>
	</template>

	<p v-else-if="elsewhere" class="pg-empty">
		Компонента {{ elsewhere.label }} у {{ frameworkLabel(framework) }} пока нет — что есть, на
		<RouterLink :to="`/${framework}`" class="pg-empty__link">витрине</RouterLink>
	</p>

	<p v-else class="pg-empty">Компонент «{{ id }}» не найден.</p>
</template>
