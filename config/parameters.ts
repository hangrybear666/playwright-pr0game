export const parameters = {
  // minimum delay to wait between page interactions
  RANDOM_INTERACTION_DELAY_MIN: 1000, // in ms
  // maximum delay to wait between page interactions
  RANDOM_INTERACTION_DELAY_MAX: 5000, // in ms

  // builds can be started if not surpassing this energy deficit
  ENERGY_DEFICIT_ALLOWED: 50,

  // time to wait for explicitly timeout overwrites of e.g. expects and isVisible locator events
  ACTION_TIMEOUT: 15000, // in ms

  // base interval between refreshes while waiting for the queue to finish
  // QUEUE_REFRESH_INTERVAL: 67500, // in ms
  // variance between refreshes while waiting for the queue to finish
  // QUEUE_REFRESH_INTERVAL_VARIANCE: 22500, // in ms

  // base interval for checking if construction resources are available
  RESOURCE_DEFICIT_RECHECK_INTERVAL: 600000, // in ms  // TODO weg
  // variance for checking if construction resources are available
  RESOURCE_DEFICIT_RECHECK_VARIANCE: 60000 // in ms  // TODO weg
};
