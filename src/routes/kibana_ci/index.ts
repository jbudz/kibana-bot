import { buildCreateRoute } from './build_create_route'
import { buildCompleteRoute } from './build_complete_route'
import { addMetricRoute } from './add_metric_route'
import { addMetricsRoute } from './add_metrics_route'
import { addGitInfoRoute } from './add_git_info'

export const kibanaCiRoutes = [
  buildCreateRoute,
  buildCompleteRoute,
  addMetricRoute,
  addMetricsRoute,
  addGitInfoRoute,
]
