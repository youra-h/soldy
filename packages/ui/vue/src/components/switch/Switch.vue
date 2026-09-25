<script lang="ts">
import SetupSwitch from './setup.component'

export default { ...SetupSwitch }
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
			Корень рисуется по `tag`, по умолчанию `span`: переключатель кладут
			в подпись `Label`, а внутри `label` HTML разрешает только строчную
			разметку. Поэтому и всё внутри — `span`.
		-->
		<input
			type="checkbox"
			:id="id"
			:checked="value"
			:name="name"
			:disabled="disabledResolved"
			:required="required"
			v-bind="{ ...aria, ...controlAttrs }"
		/>
		<!--
			Дорожка с ручкой — декор: состояние скринридеру сообщает нативный
			`checked`. `aria-hidden` не пускает содержимое слотов `on` и `off`
			в доступное имя, которое переключателю даёт подпись.
		-->
		<span class="s-switch__track" aria-hidden="true">
			<span class="s-switch__track--thumb">
				<transition name="fade" mode="out-in">
					<slot v-if="!value" name="off" :value="value" :ctrl="ctrl"> </slot>
					<slot v-else name="on" :value="value" :ctrl="ctrl"> </slot>
				</transition>
			</span>
		</span>
	</component>
</template>
