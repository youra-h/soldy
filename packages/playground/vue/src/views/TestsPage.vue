<script setup lang="ts">
import { computed, onUnmounted, watch } from 'vue'
import { Button } from '@soldy-ui/vue'
import { summarize, type TScenario } from '@soldy-ui/playground-shared'
import { findAvailable } from '../catalog'
import { hostOf } from '../hosts'
import ScenarioBlock from '../components/ScenarioBlock.vue'
import { useScenarios, type TScenarioBench } from '../composables/useScenarios'

/**
 * Страница одного компонента в одной теме: `/<фреймворк>/tests/<тема>/<компонент>`.
 *
 * Без `topic` — у хоста фреймворка нет ни одной темы, и `/<фреймворк>/tests`
 * показывает пустое состояние.
 */
const props = defineProps<{ framework: string; topic?: string; component?: string }>()

const bench = useScenarios(() => props.framework)

const topic = computed(() => bench.value.topics.find((candidate) => candidate.id === props.topic))
const entry = computed(() =>
	props.component ? findAvailable(hostOf(props.framework), props.component) : undefined,
)

function scenariosOf(
	from: TScenarioBench,
	topicId?: string,
	componentId?: string,
): readonly TScenario[] {
	return from.scenarios.filter(
		(scenario) => scenario.topic === topicId && scenario.component === componentId,
	)
}

const scenarios = computed(() => scenariosOf(bench.value, props.topic, props.component))

/**
 * Автоматические сверху, ручные снизу: первые запускаются пачкой и читаются
 * по итогу, вторые проходят по одному, по шагам своего блока.
 */
const autos = computed(() => scenarios.value.filter((scenario) => scenario.kind === 'auto'))
const manuals = computed(() => scenarios.value.filter((scenario) => scenario.kind === 'manual'))

const autoSummary = computed(() => summarize(autos.value, bench.value.states.value))
const manualSummary = computed(() => summarize(manuals.value, bench.value.states.value))

function runAuto(): void {
	void bench.value.runner.runAuto(autos.value.map((scenario) => scenario.id))
}

/**
 * Уход со страницы — на другой компонент, другую тему, другой фреймворк или
 * страницу свойств — снимает её сцены. Незаконченные прогоны отменяются и
 * возвращаются в «не запускался»: ждать человека на странице, которой он не
 * видит, бессмысленно. Итоги законченных остаются — у стенда своего
 * фреймворка.
 */
function release(from: TScenarioBench, topicId?: string, componentId?: string): void {
	from.runner.release(scenariosOf(from, topicId, componentId).map((scenario) => scenario.id))
}

watch(
	() => [bench.value, props.topic, props.component] as const,
	(_next, [previousBench, previousTopic, previousComponent]) =>
		release(previousBench, previousTopic, previousComponent),
)

onUnmounted(() => release(bench.value, props.topic, props.component))
</script>

<template>
	<template v-if="topic && entry && scenarios.length">
		<h1 class="pg__page-title">{{ topic.label }} · {{ entry.label }}</h1>
		<p class="pg__page-lead">
			{{ topic.description }} · события идут в консоль браузера с пометкой сценария
		</p>

		<!--
			Ключ блока — с фреймворком: у каждого фреймворка свой стенд, и блок
			отдаёт узлы сцены стенду, с которым смонтирован.
		-->
		<section v-if="autos.length" class="pg-tests__section pg-tests__section--auto">
			<div class="pg-tests__bar">
				<h2 class="pg-tests__title">Автоматические</h2>
				<Button
					variant="accent"
					size="sm"
					class="pg-tests__run-all"
					@action:press="runAuto"
				>
					Запустить все
				</Button>
				<span class="pg-tests__count">
					прошли {{ autoSummary.auto.passed }}, упали {{ autoSummary.auto.failed }} из
					{{ autoSummary.auto.total }}
				</span>
				<span v-if="autoSummary.failed" class="pg-badge pg-badge--failed">
					errors: {{ autoSummary.failed }}
				</span>
				<span v-else-if="autoSummary.passed" class="pg-badge pg-badge--passed">✓</span>
			</div>

			<ScenarioBlock
				v-for="scenario in autos"
				:key="`${framework}:${scenario.id}`"
				:scenario="scenario"
				:bench="bench"
			/>
		</section>

		<section v-if="manuals.length" class="pg-tests__section pg-tests__section--manual">
			<div class="pg-tests__bar">
				<h2 class="pg-tests__title">Ручные</h2>
				<span class="pg-tests__count">
					прошли {{ manualSummary.manual.passed }}, ждут
					{{ manualSummary.manual.waiting }}, упали {{ manualSummary.manual.failed }} из
					{{ manualSummary.manual.total }} · каждый запускается своей кнопкой, шаги — в
					блоке
				</span>
				<span v-if="manualSummary.failed" class="pg-badge pg-badge--failed">
					errors: {{ manualSummary.failed }}
				</span>
				<span v-else-if="manualSummary.passed" class="pg-badge pg-badge--passed">✓</span>
			</div>

			<ScenarioBlock
				v-for="scenario in manuals"
				:key="`${framework}:${scenario.id}`"
				:scenario="scenario"
				:bench="bench"
			/>
		</section>
	</template>

	<p v-else-if="props.topic" class="pg-empty">
		В теме «{{ props.topic }}» нет сценариев для «{{ props.component ?? '' }}».
	</p>

	<p v-else class="pg-empty">Сценариев для этого стенда пока нет.</p>
</template>
