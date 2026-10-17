<template>
	<div class="so-menu-group">
		<!--
			Пункты под общей подписью: `role="group"` и `aria-labelledby` на
			подпись. Группа переключателей (`Menu.RadioGroup`) выглядит так же —
			одна отметка в ней забота расширения меню, а не разметки.
		-->

		<!-- Подпись — текст `label` группы; нет подписи — нет и обёртки -->
		<div class="so-menu-group__label">
			<slot name="label" />
		</div>

		<slot />
	</div>
</template>
