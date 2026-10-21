import { DrawerDescriptor } from '@soldy-ui/setup'
import type { IDrawer } from '@soldy-ui/core'
import { createAngularAdapterContext, useAdapter } from '../../adapter'
import type { TBinding } from '../../adapter'

/**
 * setupDrawer — setup-слой Drawer: собирает компонент
 * (`createAngularAdapterContext` — с локалью ближайшего провайдера, от неё
 * имя крестика) и связывает его с Angular через useAdapter.
 *
 * Логики здесь нет: нажатие мимо — `TDismissPlugin`, фокус, Tab и Escape —
 * `TModalFocusPlugin`, немой фон — `THideOutsidePlugin`, запертая прокрутка —
 * `TScrollLockPlugin` по `locksScroll`, жест — `TSwipePlugin`, слой и размер в
 * стилях — `TDrawerLayoutPlugin`, имя от заголовка — `TModalIdsPlugin`, имя
 * крестика — `TModalNamesPlugin`. Разметка раскладывает то, что отдали ядро и
 * плагины: выход `layout_backdropStyles` шаблон кладёт на подложку, а
 * `dismiss_ownerAttribute` база — на панель.
 */
export function setupDrawer(ctrl: IDrawer | undefined, props: object): TBinding<IDrawer> {
	const adapter = createAngularAdapterContext(DrawerDescriptor(), { ctrl, props })

	return useAdapter(adapter)
}
