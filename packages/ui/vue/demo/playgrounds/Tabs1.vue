<script setup lang="ts">
import { ref } from 'vue'
import { TTabs, TTabsCollection, TabsFactory } from '@soldy/core'
import type { ITabItem } from '@soldy/core'
import { Tabs, TabItem } from '@soldy/ui-vue'

// --- Вариант 1: через instance (программный) ---

const tabs = new TTabs()
tabs.variant = 'accent'
tabs.view = 'contained'
tabs.orientation = 'horizontal'

const collection: TTabsCollection = TabsFactory(tabs)

const { plain, activation } = collection.extensions

plain.push({ text: 'Tab 1', value: 'tab1', closable: true })
const tab = plain.push({ text: 'Tab 2', value: 'tab2', closable: true })
plain.push({ text: 'Tab 3', value: 'tab3' })

activation.activate(tab)

// --- Вариант 2: через prop items ---
const tabItems = [
	{ text: 'Alpha', value: 'alpha', closable: true },
	{ text: 'Beta', value: 'beta', closable: true, _: { active: true } },
	{ text: 'Gamma', value: 'gamma', closable: true, disabled: true },
]
</script>

<template>
	<div style="display: flex; flex-direction: column; gap: 2rem">
		<div class="tabs-slots-demo__section">
			<h4 class="tabs-slots-demo__subtitle">Closable tabs</h4>
			<Tabs closable>
				<TabItem text="Tab 1" value="t1" active />
				<TabItem text="Tab 2" value="t2" />
				<TabItem text="Tab 3 (not closable)" value="t3" :closable="false" />
				<template #panel:t1><p>Content 1</p></template>
				<template #panel:t2><p>Content 2</p></template>
				<template #panel:t3><p>Content 3</p></template>
			</Tabs>
		</div>

		<section>
			<h2>Вариант 1: программный (через instance)</h2>
			<Tabs :ctrl="tabs" :engine="collection">
				<template #panel:tab1><p>Содержимое Tab 1</p></template>
				<template #panel:tab2><p>Содержимое Tab 2</p></template>
				<template #panel:tab3><p>Содержимое Tab 3</p></template>
			</Tabs>
		</section>

		<section>
			<h2>Вариант 2: prop items</h2>
			<Tabs :items="tabItems" view="outline" variant="normal">
				<template #leading>leading</template>
				<template #panel:alpha><p>Содержимое Alpha</p></template>
				<template #panel:beta><p>Содержимое Beta</p></template>
				<template #panel:gamma><p>Содержимое Gamma</p></template>
				<template #trailing>trailing</template>
			</Tabs>
		</section>
		<!--
		<section>
			<h2>Вариант 3: декларативный (TabItem в слоте)</h2>
			<Tabs view="contained">
				<template #leading>leading</template>
				<TabItem text="Профиль" value="profile" />
				<TabItem text="Настройки" value="settings" active />
				<TabItem text="О проекте" value="about" />
				<template #panel:profile><p>Содержимое Профиль</p></template>
				<template #panel:settings><p>Содержимое Настройки</p></template>
				<template #panel:about><p>Содержимое О проекте</p></template>
				<template #trailing>trailing</template>
			</Tabs>
		</section>

		<section>
			<h2>Вариант 4: вертикальные табы (position: start — по умолчанию)</h2>
			<Tabs view="contained" variant="positive" orientation="vertical">
				<TabItem text="Профиль" value="profile" active />
				<TabItem text="Настройки" value="settings" />
				<TabItem text="О проекте" value="about" />
				<template #panel:profile><p>Содержимое Профиль</p></template>
				<template #panel:settings><p>Содержимое Настройки</p></template>
				<template #panel:about><p>Содержимое О проекте</p></template>
			</Tabs>
		</section>

		<section>
			<h2>Вариант 5: вертикальные табы (position: end — список справа)</h2>
			<Tabs view="contained" variant="positive" orientation="vertical" position="end">
				<TabItem text="Профиль" value="profile" active />
				<TabItem text="Настройки" value="settings" />
				<TabItem text="О проекте" value="about" />
				<template #panel:profile><p>Содержимое Профиль</p></template>
				<template #panel:settings><p>Содержимое Настройки</p></template>
				<template #panel:about><p>Содержимое О проекте</p></template>
			</Tabs>
		</section>

		<section>
			<h2>Вариант 6: alignment — center</h2>
			<Tabs view="line" alignment="center">
				<TabItem text="Tab 1" value="t1" active />
				<TabItem text="Tab 2" value="t2" />
				<TabItem text="Tab 3" value="t3" />
			</Tabs>
		</section>

		<section>
			<h2>Вариант 7: alignment — end</h2>
			<Tabs view="contained" alignment="end">
				<TabItem text="Tab 1" value="t1" active />
				<TabItem text="Tab 2" value="t2" />
				<TabItem text="Tab 3" value="t3" />
			</Tabs>
		</section>

		<section>
			<h2>Вариант 8: alignment — stretch (justify-between)</h2>
			<Tabs view="contained" alignment="stretch">
				<TabItem text="Tab 1" value="t1" active />
				<TabItem text="Tab 2" value="t2" />
				<TabItem text="Tab 3" value="t3" />
			</Tabs>
		</section> -->
	</div>
</template>
