import '@soldy-ui/webc/label'
import '@soldy-ui/webc/switch'
import { so } from '../dom'

export default () => so('label', 'so-label', { text: 'Включено' }, [so('span', 'so-switch')])
