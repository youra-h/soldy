<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, useTemplateRef } from 'vue'
import { Button } from '@soldy-ui/vue'
import type { TScenario, TScenarioState, TScenarioStatus } from '@soldy-ui/playground-shared'
import type { TScenarioBench } from '../composables/useScenarios'

const props = defineProps<{ scenario: TScenario; bench: TScenarioBench }>()

const scene = useTemplateRef<HTMLElement>('scene')
const target = useTemplateRef<HTMLElement>('target')

const IDLE: TScenarioState = { status: 'idle', checks: [] }

const STATUS: Record<TScenarioStatus, string> = {
	idle: 'не запускался',
	running: 'идёт',
	waiting: 'ждёт человека',
	passed: 'прошёл',
	failed: 'упал',
}

const state = computed(() => props.bench.states.value[props.scenario.id] ?? IDLE)
const staged = computed(() => props.bench.staged.has(props.scenario.id))
const manual = computed(() => props.scenario.kind === 'manual')

/**
 * Сцену хост находит по идентификатору сценария: блок отдаёт ему свои узлы,
 * пока смонтирован. Узлы одни на всё время жизни блока — перезапуск
 * монтирует компонент заново в тот же узел, а не меняет саму сцену.
 *
 * Узел монтирования — пустой и `display: contents`: компонент хоста стоит в
 * раскладке сцены сам, как стоял бы её прямой ребёнок.
 */
onMounted(() => {
	if (scene.value && target.value) {
		props.bench.attach(props.scenario.id, { scene: scene.value, target: target.value })
	}
})

onBeforeUnmount(() => {
	if (scene.value) props.bench.detach(props.scenario.id, scene.value)
})

function run(): void {
	void props.bench.runner.run(props.scenario.id)
}

function mark(passed: boolean): void {
	props.bench.runner.mark(props.scenario.id, passed)
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
			сценарий. Слоты и раскладку смотрят именно так. Компонент в неё
			монтирует хост фреймворка — в пустой узел, заглушка стоит рядом.
		-->
		<div ref="scene" class="pg-scenario__scene">
			<div ref="target" class="pg-mount" />
			<span v-if="!staged" class="pg-scenario__placeholder">Сцена появится при запуске</span>
		</div>
	</article>
</template>
