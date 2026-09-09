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
 * Фасад коллекции правой колонки.
 *
 * Коллекционные свойства (`mode`) живут не на инстансе компонента, а на фасаде,
 * и стенду он в руки не даётся: превью создаёт его у себя внутри. Зато отдаёт
 * наружу движок — событием `engine:create`. Поверх готового движка фасад
 * строится штатным конструктором, и запись через него доходит до живого
 * компонента: фасад не владеет состоянием, а именует доступ к движку.
 */
const facade = shallowRef<TInstance | null>(null)

/**
 * `ctor` в дескрипторе объявлен как `any` — точнее его там не выразить: это
 * класс любого компонента ядра. Сужаем до «конструктор объекта со свойствами»,
 * чего для записи пропа достаточно.
 */
function createInstance(): TInstance {
	const Ctor = props.entry.descriptor().ctor as new () => TInstance

	return new Ctor()
}

/** Движок пришёл — строим над ним фасад и досылаем то, что уже накрутили. */
function bindEngine(engine: unknown): void {
	const factory = props.entry.collectionDescriptor

	if (!factory || facade.value) return

	const Ctor = factory().ctor as new (props: object, options: object) => TInstance

	facade.value = new Ctor({}, { engine })

	// Досылаем только то, что уже накрутили до появления движка, и только своё.
	// Слать всё подряд нельзя: `undefined` — это «проп не задан», а не значение,
	// и запись его в ядро ломает вычисляемые свойства (`TSelect.clearAria`
	// разбирает `name` как строку).
	if (props.control.scope === 'collection' && value.value !== undefined) write(value.value)
}

/** Куда писать проп: коллекционный — в фасад, остальные — в инстанс. */
function write(next: unknown): void {
	const target = props.control.scope === 'collection' ? facade.value : instance.value

	// Пустая строка означает «проп не задан», а не пустое значение
	if (target) target[props.control.name] = next === '' ? undefined : next
}

watch(value, write)

onUnmounted(() => instance.value.destroy?.())

const propBind = computed(() => ({
	...(value.value === undefined || value.value === ''
		? {}
		: { [props.control.name]: value.value }),
	...props.tag('props'),
	key: props.iconVersion,
}))

const instanceBind = computed(() => {
	const tagged = props.tag('instance')
	const logCreate = tagged['onEngine:create']

	return {
		ctrl: instance.value,
		...tagged,
		// Свой обработчик поверх журнального: тот пишет событие в консоль, этот
		// забирает движок. Просто перезаписать нельзя — потеряется журнал
		'onEngine:create': (engine: unknown, ...rest: unknown[]) => {
			logCreate?.(engine, ...rest)
			bindEngine(engine)
		},
		key: props.iconVersion,
	}
})
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
