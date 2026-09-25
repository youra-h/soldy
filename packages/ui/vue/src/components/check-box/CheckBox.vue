<script lang="ts">
import { Icon } from '../icon'
import SetupCheckBox from './setup.component'

export default { ...SetupCheckBox, components: { Icon } }
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
			:disabled="disabledResolved"
			:required="required"
			v-bind="{ ...aria, ...controlAttrs }"
		/>
		<!--
			Коробка с отметкой — декор: состояние скринридеру сообщают
			нативные `checked` и `indeterminate`. `aria-hidden` не пускает
			иконки слотов в доступное имя, которое чекбоксу даёт подпись.
		-->
		<span class="s-check-box__container" aria-hidden="true">
			<!-- Слот для checked иконки -->
			<slot
				v-if="value && !indeterminate"
				name="icon"
				:value="value"
				:indeterminate="indeterminate"
			>
				<Icon embedded="check-box.icon" :tag="defaultIconTag" :size="size" />
			</slot>
			<!-- Слот для indeterminate иконки -->
			<slot
				v-else-if="indeterminate"
				name="indeterminate-icon"
				:value="value"
				:indeterminate="indeterminate"
			>
				<Icon
					embedded="check-box.indeterminate-icon"
					:tag="defaultIndeterminateIconTag"
					:size="size"
				/>
			</slot>
		</span>
	</component>
</template>
