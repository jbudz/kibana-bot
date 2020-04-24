import { buildCreateRoute } from './build_create_route'
import { buildCompleteRoute } from './build_complete_route'
import { addMetricRoute } from './add_metric_route'

export const kibanaCiRoutes = [
  buildCreateRoute,
  buildCompleteRoute,
  addMetricRoute,
]
