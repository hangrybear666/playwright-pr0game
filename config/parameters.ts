export const parameters = {
  QUEUE_REFRESH_INTERVAL: 24000, // in ms
  QUEUE_REFRESH_INTERVAL_VARIANCE: 8000, // in ms
  RESOURCE_DEFICIT_RECHECK_INTERVAL: 300000, // in ms
  RESOURCE_DEFICIT_RECHECK_VARIANCE: 30000, // in ms
  RANDOM_INTERACTION_DELAY_MIN: 1000, // in ms
  RANDOM_INTERACTION_DELAY_MAX: 5000, // in ms
  ENERGY_DEFICIT_ALLOWED: 50 // builds can be started if not surpassing this energy deficit
};
