<script lang="ts">
import SetupRadioGroupItem from './setup.component'

export default { ...SetupRadioGroupItem }
</script>

<template>
	<component
		ref="rootElement"
		:is="tag"
		v-if="rendered"
		v-show="visible"
		:class="classes"
		v-bind="{ ...dataset, ...containerAttrs, ...attrs }"
	>
		<!--
			Корень — `label` (`tag` радио по умолчанию): клик по подписи выбирает
			радио, а подпись становится его доступным именем. На корне — `dataset`
			(`data-selected`, `data-disabled`), `attrs` (`dir`) и модификаторы
			размера, варианта и вида в `classes`: тема читает всё отсюда.
		-->
		<!--
			Нативное радио. Группировку по общему `name`, стрелки по кругу,
			пропуск выключенных, пробел, один Tab-стоп на группу и участие в
			форме даёт браузер. Набор `aria` радио — сюда; `checked` и
			`disabled` нативные, ARIA-дублей им нет. Сквозные атрибуты (`id`
			для `<label for>` снаружи, обработчики) — тоже сюда.

			Выбор пользователя приходит `change`: браузер уже отметил радио и
			снял отметку с соседа, коллекции остаётся сделать его активным.

			Стоит перед контролом: кольцо фокуса тема рисует соседним
			селектором от него. Визуально радио скрыто темой.
		-->
		<input
			class="s-radio-group-item__input"
			type="radio"
			:name="name"
			:value="value"
			:checked="active"
			:disabled="resolvedDisabled"
			v-bind="{ ...aria, ...controlAttrs }"
			@change="context && (context.adapters.activation.active = true)"
		/>
		<!--
			Кольцо и точка — декоративная разметка без текста: отметку
			скринридеру сообщает нативный `checked`. Точка стоит всегда — у
			неотмеченного тема сжимает её в ноль, у вида `ring` прячет и
			утолщает кольцо.
		-->
		<span class="s-radio-group-item__control">
			<span class="s-radio-group-item__indicator"></span>
		</span>
		<!--
			Подпись — только слот: текста у радио нет, оно голый контрол, как
			CheckBox. Подписи может не быть — тогда она лежит в соседнем
			элементе, а пустую обёртку тема прячет сама (`:empty`), поэтому
			вокруг слота нет пробельного текста.
		-->
		<span class="s-radio-group-item__text"><slot /></span>
	</component>
</template>
