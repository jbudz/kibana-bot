import { addGitInfoRoute } from './add_git_info'
import { addMetricsRoute } from './add_metrics_route'
import { buildCompleteRoute } from './build_complete_route'
import { buildCreateRoute } from './build_create_route'

export const v1KibanaCiRoutes = [
  addGitInfoRoute,
  addMetricsRoute,
  buildCompleteRoute,
  buildCreateRoute,
]
