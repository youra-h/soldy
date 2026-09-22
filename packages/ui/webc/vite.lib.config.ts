// Расширение обязательно: с ним конфиг читает и нативный загрузчик Vite
import { libConfig } from '../../../tools/vite/lib.config.ts'

/**
 * Библиотечная сборка @soldy-ui/webc: Custom Elements на headless-моделях ядра.
 *
 * Фреймворка у пакета нет — только TS и DOM, поэтому ни плагинов, ни своего
 * external сверх соседей по скоупу. Декларации собирает
 * `tsc -p tsconfig.build.json` вторым шагом скрипта `build`.
 */
export default libConfig({
	name: '@soldy-ui/webc',
	root: import.meta.dirname,
	entry: 'src/index.ts',
})
