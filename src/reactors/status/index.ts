import { invalidateDocFailures } from './invalidate_doc_failures'
import { invalidateApmCiFailures } from './invalidate_apm_ci_failures'

export const statusReactors = [invalidateDocFailures, invalidateApmCiFailures]
