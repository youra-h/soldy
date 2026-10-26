import '@soldy-ui/webc/check-box'
import '@soldy-ui/webc/label'
import { so } from '../dom'

export default () => so('label', 'so-label', { text: 'Согласен' }, [so('span', 'so-check-box')])
