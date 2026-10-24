<script lang="ts">
import SetupItemRow from './setup.component'

/**
 * Строка элемента коллекции — деталь разметки ListBox.Item, опции Select,
 * пунктов меню и тега. Пропсы, события и разметка — Button (`BaseButton`, тот
 * же шаблон), сборка своя — по `ItemRowDescriptor`: её экземпляр (`TItemRow`)
 * роль и остановку Tab себе не пишет, их несёт набор `aria` элемента, который
 * разметка кладёт на строку.
 *
 * Экземпляр создаёт это монтирование и отпускает его снятие: строка живёт,
 * пока нарисована, и окно `Virtual` держит их столько, сколько показывает.
 *
 * Шаблон — свой, а не `extends` от `Button.vue`: опцию `expose` Vue из
 * `extends` не берёт и предупреждает.
 */
export default { ...SetupItemRow }
</script>

<template>
	<component
		ref="rootElement"
		:is="tag"
		v-if="rendered"
		v-show="visible"
		:class="classes"
		v-bind="{ ...attrs, ...aria, ...dataset }"
	>
		<slot name="leading"> </slot>
		<span class="so-button__text">
			<slot :text="text">{{ text }}</slot>
		</span>
		<slot name="trailing"> </slot>
	</component>
</template>
