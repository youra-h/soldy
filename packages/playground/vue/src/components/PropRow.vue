<script setup lang="ts">
import { computed, onUnmounted, shallowRef, watch } from 'vue'
import type { TComponentEntry, TPropControl } from '@soldy/playground-shared'
import { PREVIEW_COMPONENTS } from '../previews'
import { propSnippet, instanceSnippet } from '../snippet'
import PropControl from './PropControl.vue'
import CodeView from './CodeView.vue'
import type { TEventSource } from '../composables/useEvents'

/** Экземпляр ядра со стороны стенда: пишем свойства, зовём `destroy`. */
type TInstance = Record<string, unknown> & { destroy?: () => void }

const props = defineProps<{
	entry: TComponentEntry
	control: TPropControl
	/**
	 * Обработчики событий с пометкой источника. Обе колонки эмитят одинаковые
	 * имена, и без пометки нельзя понять, чьё событие пришло.
	 */
	tag: (source: TEventSource) => Record<string, (...args: unknown[]) => void>
	iconVersion: number
}>()

const value = shallowRef<unknown>(props.control.default)

const preview = computed(() => PREVIEW_COMPONENTS[props.entry.id])

/**
 * Экземпляр ядра для правой колонки.
 *
 * Создаётся один раз на строку: у каждого пропа свой компонент, и общий
 * экземпляр склеил бы соседние строки — правка `size` меняла бы и превью
 * `variant`.
 */
const instance = shallowRef(createInstance())

/**
 * `ctor` в дескрипторе объявлен как `any` — точнее его там не выразить: это
 * класс любого компонента ядра. Сужаем до «конструктор объекта со свойствами»,
 * чего для записи пропа достаточно.
 */
function createInstance(): TInstance {
	const Ctor = props.entry.descriptor().ctor as new () => TInstance

	return new Ctor()
}

watch(value, (next) => {
	// Пустая строка означает «проп не задан», а не пустое значение
	instance.value[props.control.name] = next === '' ? undefined : next
})

onUnmounted(() => instance.value.destroy?.())

const propBind = computed(() => ({
	...(value.value === undefined || value.value === ''
		? {}
		: { [props.control.name]: value.value }),
	...props.tag('props'),
	key: props.iconVersion,
}))

const instanceBind = computed(() => ({
	ctrl: instance.value,
	...props.tag('instance'),
	key: props.iconVersion,
}))
</script>

<template>
	<section class="pg-prop">
		<!--
			Имя и контрол стоят рядом и прижаты влево. Обе колонки фиксированной
			ширины, ряд не растягивается: иначе на широком экране `margin-left:
			auto` уводил контрол к правому краю, и чтобы понять, что именно ты
			крутишь, приходилось водить глазами через всю страницу.

			Фиксированная ширина второй колонки выстраивает switch, select и
			input в одну вертикаль, а не по содержимому.
		-->
		<div class="pg-prop__head">
			<span class="pg-prop__name">{{ control.name }}</span>
			<div class="pg-prop__control">
				<PropControl :control="control" v-model="value" />
			</div>
		</div>

		<p class="pg-prop__note">{{ control.description }}</p>

		<div class="pg-prop__columns">
			<div class="pg-col">
				<div class="pg-col__head">Component</div>
				<div class="pg-col__stage">
					<component :is="preview" v-if="preview" v-bind="propBind" />
				</div>
				<CodeView
					:name="`${entry.label}-${control.name}`"
					:code="propSnippet(entry, control.name, value)"
				/>
			</div>

			<div class="pg-col">
				<div class="pg-col__head">Component Instance</div>
				<div class="pg-col__stage">
					<component :is="preview" v-if="preview" v-bind="instanceBind" />
				</div>
				<CodeView
					:name="`${entry.label}-${control.name}-instance`"
					:code="instanceSnippet(entry, control.name, value)"
				/>
			</div>
		</div>
	</section>
</template>
