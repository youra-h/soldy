<script setup lang="ts">
import { onBeforeUnmount, onMounted, useTemplateRef, watch } from 'vue'
import type { IPreviewHandle, IPreviewHost, TPreviewEventSink } from '@soldy-ui/playground-shared'
import { useIconPack } from '../composables/useIconPack'

/**
 * Сцена превью — компонент, нарисованный хостом фреймворка.
 *
 * Единственное место оболочки, которое монтирует, обновляет и снимает превью:
 * страница свойств и витрина рисуют компонент только через неё. Узел
 * монтирования — свой корень хоста, у Vue и у остальных одинаково.
 *
 * Ключ сцены — хост и версия пакета иконок: смена любого рисует компонент
 * заново, на том же узле. Пропсы при этом остаются у владельца сцены, поэтому
 * выставленное на странице переживает и смену фреймворка, и смену иконок.
 *
 * Узел в шаблоне пустой и без комментариев: его детей рисует хост, а Vue,
 * пока у узла нет своих детей, их не трогает. `display: contents` в стилях —
 * раскладке ячейки узла нет, его дети стоят в ней сами.
 */
const props = defineProps<{
	host: IPreviewHost
	/** Идентификатор компонента в реестре — ключ карты превью хоста. */
	component: string
	/** Пропсы компонента — целиком, новым объектом на каждую смену. */
	bind: Readonly<Record<string, unknown>>
	/** Куда отдать события компонента; нет — хост их не слушает. */
	sink?: TPreviewEventSink
}>()

const { version } = useIconPack()
const node = useTemplateRef<HTMLElement>('node')

let handle: IPreviewHandle | null = null

function mount(): void {
	if (!node.value) return

	handle = props.host.mount(node.value, {
		component: props.component,
		props: props.bind,
		onEvent: props.sink,
	})
}

function unmount(): void {
	handle?.unmount()
	handle = null
}

onMounted(mount)
onBeforeUnmount(unmount)

watch([() => props.host, () => props.component, version], () => {
	unmount()
	mount()
})

watch(
	() => props.bind,
	(next) => handle?.update(next),
)
</script>

<template>
	<div ref="node" class="pg-mount" />
</template>
