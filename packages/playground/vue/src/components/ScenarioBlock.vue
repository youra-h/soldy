<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, useTemplateRef } from 'vue'
import { Button } from '@soldy-ui/vue'
import type { TScenario, TScenarioState, TScenarioStatus } from '@soldy-ui/playground-shared'
import { useScenarios } from '../composables/useScenarios'

const props = defineProps<{ scenario: TScenario }>()

const bench = useScenarios()
const scene = useTemplateRef<HTMLElement>('scene')

const IDLE: TScenarioState = { status: 'idle', checks: [] }

const STATUS: Record<TScenarioStatus, string> = {
	idle: 'не запускался',
	running: 'идёт',
	waiting: 'ждёт человека',
	passed: 'прошёл',
	failed: 'упал',
}

const state = computed(() => bench.states.value[props.scenario.id] ?? IDLE)
const stage = computed(() => bench.stages.get(props.scenario.id))
const manual = computed(() => props.scenario.kind === 'manual')

/**
 * Сцену хост находит по идентификатору сценария: блок отдаёт ему свой узел,
 * пока смонтирован. Узел один на всё время жизни блока — перезапуск меняет
 * `key` компонента внутри, а не саму сцену.
 */
onMounted(() => {
	if (scene.value) bench.attach(props.scenario.id, scene.value)
})

onBeforeUnmount(() => {
	if (scene.value) bench.detach(props.scenario.id, scene.value)
})

function run(): void {
	void bench.runner.run(props.scenario.id)
}

function mark(passed: boolean): void {
	bench.runner.mark(props.scenario.id, passed)
}
</script>

<template>
	<article class="pg-scenario" :data-id="scenario.id" :data-status="state.status">
		<header class="pg-scenario__head">
			<span class="pg-chip">{{ manual ? 'ручной' : 'авто' }}</span>
			<h3 class="pg-scenario__title">{{ scenario.title }}</h3>
			<span class="pg-status" :class="`pg-status--${state.status}`">
				{{ STATUS[state.status] }}{{ state.marked ? ' · отмечено руками' : '' }}
			</span>

			<div class="pg-scenario__actions">
				<Button size="sm" class="pg-scenario__run" @action:press="run">
					{{ state.status === 'idle' ? 'Запустить' : 'Перезапустить' }}
				</Button>
				<!--
					Итог ручного ставит человек — после запуска: до него на
					сцене нечего проверять
				-->
				<template v-if="manual">
					<Button
						size="sm"
						variant="positive"
						class="pg-scenario__pass"
						:disabled="state.status === 'idle'"
						aria_label="Засчитать"
						@action:press="mark(true)"
					>
						✓
					</Button>
					<Button
						size="sm"
						variant="negative"
						class="pg-scenario__fail"
						:disabled="state.status === 'idle'"
						aria_label="Отклонить"
						@action:press="mark(false)"
					>
						✗
					</Button>
				</template>
			</div>
		</header>

		<p class="pg-scenario__note">{{ scenario.description }}</p>

		<ol v-if="scenario.steps" class="pg-scenario__steps">
			<li v-for="step in scenario.steps" :key="step">{{ step }}</li>
		</ol>

		<ul v-if="state.checks.length" class="pg-checks">
			<li
				v-for="(check, index) in state.checks"
				:key="index"
				class="pg-checks__item"
				:class="{ 'pg-checks__item--failed': !check.ok }"
			>
				{{ check.ok ? '✓' : '✗' }} {{ check.text }}
			</li>
		</ul>

		<p v-if="state.error" class="pg-scenario__error">{{ state.error }}</p>

		<!--
			Сцену можно тянуть мышью за угол (CSS `resize`) — ширину ей задаёт и
			сценарий. Слоты и раскладку смотрят именно так.
		-->
		<div ref="scene" class="pg-scenario__scene">
			<component :is="stage.component" v-if="stage" :key="stage.key" v-bind="stage.bind" />
			<span v-else class="pg-scenario__placeholder">Сцена появится при запуске</span>
		</div>
	</article>
</template>
