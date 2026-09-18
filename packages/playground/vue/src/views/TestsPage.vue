<script setup lang="ts">
import { computed, onUnmounted, watch } from 'vue'
import { Button } from '@soldy/ui-vue'
import { summarize, type TScenario } from '@soldy/playground-shared'
import { findAvailable } from '../catalog'
import ScenarioBlock from '../components/ScenarioBlock.vue'
import { useScenarios } from '../composables/useScenarios'

/** `topic` нет — у адаптера нет ни одной темы, и `/tests` показывает пустое состояние. */
const props = defineProps<{ topic?: string }>()

const bench = useScenarios()

const topic = computed(() => bench.topics.find((candidate) => candidate.id === props.topic))

function scenariosOf(id: string | undefined): readonly TScenario[] {
	return bench.scenarios.filter((scenario) => scenario.topic === id)
}

const scenarios = computed(() => scenariosOf(props.topic))

/**
 * Блоки темы — по компонентам, в порядке реестра сценариев: тема одна, а
 * компонентов в ней много, и искать глазами «что там у Select» проще по
 * заголовку, чем по списку вперемешку.
 */
const groups = computed(() => {
	const byComponent = new Map<string, TScenario[]>()

	for (const scenario of scenarios.value) {
		const group = byComponent.get(scenario.component) ?? []

		group.push(scenario)
		byComponent.set(scenario.component, group)
	}

	return [...byComponent].map(([id, list]) => ({
		id,
		label: findAvailable(id)?.label ?? id,
		scenarios: list,
	}))
})

const summary = computed(() => summarize(scenarios.value, bench.states.value))

function runAll(): void {
	void bench.runner.runAll(scenarios.value.map((scenario) => scenario.id))
}

/**
 * Уход с темы — на другую тему или на страницу свойств — снимает её сцены.
 * Незаконченные прогоны отменяются и возвращаются в «не запускался»:
 * ждать человека на странице, которой он не видит, бессмысленно. Итоги
 * законченных остаются.
 */
function release(id: string | undefined): void {
	bench.runner.release(scenariosOf(id).map((scenario) => scenario.id))
}

watch(
	() => props.topic,
	(_next, previous) => release(previous),
)

onUnmounted(() => release(props.topic))
</script>

<template>
	<template v-if="topic">
		<h1 class="pg__page-title">{{ topic.label }}</h1>
		<p class="pg__page-lead">
			{{ topic.description }} · события идут в консоль браузера с пометкой сценария
		</p>

		<div class="pg-tests__bar">
			<Button variant="accent" class="pg-tests__run-all" @action:press="runAll">
				Запустить все
			</Button>

			<span class="pg-tests__count">
				Автоматические: прошли {{ summary.auto.passed }}, упали {{ summary.auto.failed }} из
				{{ summary.auto.total }}
			</span>
			<span v-if="summary.manual.total" class="pg-tests__count">
				Ручные: прошли {{ summary.manual.passed }}, ждут {{ summary.manual.waiting }}, упали
				{{ summary.manual.failed }} из {{ summary.manual.total }}
			</span>

			<span v-if="summary.failed" class="pg-badge pg-badge--failed">
				errors: {{ summary.failed }}
			</span>
			<span v-else-if="summary.passed" class="pg-badge pg-badge--passed" title="Все прошли">
				✓
			</span>
		</div>

		<template v-for="group in groups" :key="group.id">
			<h2 class="pg__group">{{ group.label }}</h2>
			<ScenarioBlock
				v-for="scenario in group.scenarios"
				:key="scenario.id"
				:scenario="scenario"
			/>
		</template>
	</template>

	<p v-else-if="props.topic" class="pg-empty">Темы «{{ props.topic }}» нет.</p>

	<p v-else class="pg-empty">Сценариев для этого стенда пока нет.</p>
</template>
