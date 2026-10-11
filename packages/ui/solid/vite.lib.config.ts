// Расширение обязательно: с ним конфиг читает и нативный загрузчик Vite
import solid from 'vite-plugin-solid'
import { libConfig } from '../../../tools/vite/lib.config.ts'

/**
 * Библиотечная сборка @soldy-ui/solid: компоненты на headless-моделях ядра.
 *
 * Плагин обязателен: JSX Solid компилируется в вызовы его рантайма, а не в
 * `createElement`, и без плагина сборка встала бы на первом `.tsx`. Декларации
 * собирает `tsc -p tsconfig.build.json` вторым шагом скрипта `build`.
 *
 * Этот бандл собран под браузер и уезжает условием `default`. Серверный рендер
 * и гидратацию приложение получает из исходника с JSX — его выпускает третий
 * шаг, `tsc -p tsconfig.source.json`, под условием `solid` (docs/agents/build.md,
 * «Сборка пакетов»).
 */
export default libConfig({
	name: '@soldy-ui/solid',
	root: import.meta.dirname,
	entry: 'src/index.ts',
	external: ['solid-js'],
	plugins: [solid()],
})
