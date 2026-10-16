import { MOTION_MODES } from '../registry'
import type { IScenarioContext } from './types'

/**
 * Общее у ручных сценариев темы `motion` — движения, которое оценивает только
 * глаз: шаги, которыми кончается каждый, и замедленная сцена.
 */

/** Последний шаг любого сценария движения. */
export const VERDICT = 'Всё так — ✓, иначе ✗'

/**
 * Движение убрано — как это включить на стенде: режимом в шапке, не трогая
 * настройку системы. Тема рисует его так же, как просьбу системы.
 */
export const REDUCE = `Выберите в шапке «Анимация движения» → «${MOTION_MODES.reduce}»`

/** Скорость замедленной сцены: переходы и анимации идут в десять раз медленнее. */
const SLOW = 0.1

/** Анимации и переходы документа, чья цель — под корнем; у псевдоэлемента цель — его узел. */
function animationsUnder(root: string): Animation[] {
	return document.getAnimations().filter((animation) => {
		const target = animation.effect instanceof KeyframeEffect ? animation.effect.target : null

		return target !== null && target.closest(root) !== null
	})
}

/**
 * `run` замедленной сцены: пока прогон не отменён, каждым кадром ставит
 * медленную скорость (`SLOW`) анимациям и переходам документа под корнем
 * `root`. Переход темы длится десятые доли секунды, и кто куда едет, на обычной
 * скорости не разглядеть.
 *
 * Замедляет Web Animations (`playbackRate`), а не тема: библиотека о замедлении
 * не знает, и правки ради стенда в ней нет. Переход браузер заводит на смену
 * стиля, а скорость ему ставит следующий кадр — раньше, чем переход успеет
 * пройти заметную часть пути. Отмена прогона — отметка ✓ или ✗, перезапуск
 * или уход со страницы — возвращает обычную скорость: замедлена только сцена,
 * на которую смотрят.
 *
 * Корень — селектор, а не узел сцены: компонент рисуется и вне её — регион
 * тостов телепортирован в `body`. Селектор сверяется каждым кадром: регион
 * может появиться и смениться уже после старта прогона.
 *
 * Сцена только показывает и сама не кончается (`TManualScenario.run`):
 * `ctx.frame()` бросает отмену, и итог остаётся тем, что поставил человек. Из
 * контекста помощнику нужны только кадр и отмена.
 */
export async function slowMotion(
	ctx: Pick<IScenarioContext, 'frame' | 'signal'>,
	root: string,
): Promise<void> {
	try {
		while (!ctx.signal.aborted) {
			for (const animation of animationsUnder(root)) {
				if (animation.playbackRate !== SLOW) animation.playbackRate = SLOW
			}

			await ctx.frame()
		}
	} finally {
		for (const animation of animationsUnder(root)) animation.playbackRate = 1
	}
}
