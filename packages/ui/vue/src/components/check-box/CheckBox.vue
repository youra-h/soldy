<script lang="ts">
import SetupCheckBox from './setup.component'

export default { ...SetupCheckBox }
</script>

<template>
	<component
		ref="rootElement"
		:is="tag"
		v-if="rendered"
		v-show="visible"
		:class="classes"
		v-bind="{ ...attrs, ...containerAttrs }"
	>
		<!--
			Корень рисуется по `tag`, по умолчанию `span`: чекбокс кладут в
			подпись `Label`, а внутри `label` HTML разрешает только строчную
			разметку. Поэтому и всё внутри — `span`.
		-->
		<input
			type="checkbox"
			:id="id"
			:checked="value"
			:indeterminate="indeterminate"
			:name="name"
			:disabled="disabled"
			:required="required"
			v-bind="{ ...aria, ...controlAttrs }"
		/>
		<!--
			Коробка с отметкой — декор: состояние скринридеру сообщают
			нативные `checked` и `indeterminate`. `aria-hidden` не пускает
			иконки слотов в доступное имя, которое чекбоксу даёт подпись.

			Отметка без слота — `svg` иконки по роли (`check`,
			`checkIndeterminate`), а не компонент Icon: она появляется и
			пропадает с каждой сменой отметки, и Icon собирал бы на каждую свой
			контекст и плагины — в таблице «выбрать все» собирала их тысячами.
			Размер и цвет отметке даёт тема чекбокса по `s-check-box__mark`.
		-->
		<span class="s-check-box__container" aria-hidden="true">
			<!-- Слот для checked иконки -->
			<slot
				v-if="value && !indeterminate"
				name="icon"
				:value="value"
				:indeterminate="indeterminate"
			>
				<component :is="defaultIconTag" class="s-check-box__mark" />
			</slot>
			<!-- Слот для indeterminate иконки -->
			<slot
				v-else-if="indeterminate"
				name="indeterminate-icon"
				:value="value"
				:indeterminate="indeterminate"
			>
				<component :is="defaultIndeterminateIconTag" class="s-check-box__mark" />
			</slot>
		</span>
	</component>
</template>
