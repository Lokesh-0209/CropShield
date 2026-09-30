import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getCases,
  getCase,
  submitCase,
  verifyCase,
  getOutbreaks,
  recalculateOutbreaks,
  getAlerts,
  runRiskSimulation,
  getSurveillanceQueue,
  getWeather,
} from './api';

export const QUERY_KEYS = {
  cases: (params) => ['cases', params],
  case: (id) => ['case', id],
  outbreaks: (params) => ['outbreaks', params],
  alerts: (params) => ['alerts', params],
  surveillanceQueue: (params) => ['surveillance-queue', params],
  weather: (lat, lon) => ['weather', lat, lon],
};

/**
 * Hook to fetch cases with caching & automatic retry
 */
export function useCases(params = {}) {
  return useQuery({
    queryKey: QUERY_KEYS.cases(params),
    queryFn: () => getCases(params),
  });
}

/**
 * Hook to fetch a single case by ID
 */
export function useCase(caseId) {
  return useQuery({
    queryKey: QUERY_KEYS.case(caseId),
    queryFn: () => getCase(caseId),
    enabled: Boolean(caseId),
  });
}

/**
 * Mutation to submit a new field case
 */
export function useSubmitCase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (caseData) => submitCase(caseData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      queryClient.invalidateQueries({ queryKey: ['outbreaks'] });
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['surveillance-queue'] });
    },
  });
}

/**
 * Mutation for officer case verification
 */
export function useVerifyCase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ caseId, verification }) => verifyCase(caseId, verification),
    onSuccess: (updatedCase) => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      if (updatedCase?.id) {
        queryClient.invalidateQueries({ queryKey: ['case', updatedCase.id] });
      }
      queryClient.invalidateQueries({ queryKey: ['outbreaks'] });
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
}

/**
 * Hook to fetch spatial outbreak clusters & intelligence
 */
export function useOutbreaks(params = {}) {
  return useQuery({
    queryKey: QUERY_KEYS.outbreaks(params),
    queryFn: () => getOutbreaks(params),
  });
}

/**
 * Mutation to recalculate outbreak clusters with parameter tuning
 */
export function useRecalculateOutbreaks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params) => recalculateOutbreaks(params),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(QUERY_KEYS.outbreaks(variables), data);
      queryClient.invalidateQueries({ queryKey: ['outbreaks'] });
    },
  });
}

/**
 * Hook to fetch outbreak advisories & alerts
 */
export function useAlerts(params = {}) {
  return useQuery({
    queryKey: QUERY_KEYS.alerts(params),
    queryFn: () => getAlerts(params),
  });
}

/**
 * Mutation to run deterministic risk assessment simulation
 */
export function useRiskSimulation() {
  return useMutation({
    mutationFn: (riskInput) => runRiskSimulation(riskInput),
  });
}

/**
 * Hook to fetch prioritized active surveillance queue
 */
export function useSurveillanceQueue(params = {}) {
  return useQuery({
    queryKey: QUERY_KEYS.surveillanceQueue(params),
    queryFn: () => getSurveillanceQueue(params),
  });
}

/**
 * Hook to fetch real-time agro-meteorological data
 */
export function useWeather(lat = 13.1368, lon = 78.1348) {
  return useQuery({
    queryKey: QUERY_KEYS.weather(lat, lon),
    queryFn: () => getWeather(lat, lon),
  });
}
