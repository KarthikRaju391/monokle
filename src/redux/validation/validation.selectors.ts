import {TypedUseSelectorHook} from 'react-redux';

import {createSelector} from '@reduxjs/toolkit';

import {useAppSelector} from '@redux/hooks';

import {
  RuleLevel,
  ValidationResult,
  getFileId,
  getFileLocation,
  getResourceId,
  getResourceLocation,
} from '@monokle/validation';
import {RootState} from '@shared/models/rootState';
import {MonacoRange} from '@shared/models/ui';
import {ValidationState} from '@shared/models/validation';

import {VALIDATOR} from './validator';

export const useValidationSelector: TypedUseSelectorHook<ValidationState> = (selector, equalifyFn) =>
  useAppSelector(state => selector(state.validation), equalifyFn);

/* * * * * * * * * * * * * * * * * *
 * All problems
 * * * * * * * * * * * * * * * * * */
export const problemsSelector = createSelector(
  [(state: ValidationState) => state.lastResponse, (_: ValidationState, level?: RuleLevel) => level],
  (response, level) => {
    const allProblems = response?.runs.flatMap(r => r.results) ?? [];
    return level ? allProblems.filter(problem => (problem.level ?? 'warning') === level) : allProblems;
  }
);

export const errorsSelector = (state: ValidationState) => problemsSelector(state, 'error');
export const warningsSelector = (state: ValidationState) => problemsSelector(state, 'warning');

/* * * * * * * * * * * * * * * * * *
 * Problems by resource
 * * * * * * * * * * * * * * * * * */
export const problemsByResourcesSelector = createSelector(
  [(state: ValidationState) => problemsSelector(state), (_: ValidationState, level?: RuleLevel) => level],
  (problems, level): Record<string, ValidationResult[] | undefined> => {
    const problemsByResources: Map<string, ValidationResult[]> = new Map();

    problems.forEach(problem => {
      if (level && (problem.level ?? 'warning') !== level) {
        return;
      }

      const resourceId = getResourceId(problem);

      if (resourceId === undefined) {
        return;
      }

      if (!problemsByResources.has(resourceId)) {
        problemsByResources.set(resourceId, []);
      }

      problemsByResources.get(resourceId)?.push(problem);
    });

    return Object.fromEntries(problemsByResources);
  }
);

export const errorsByResourcesSelector = (state: ValidationState) => problemsByResourcesSelector(state, 'error');
export const warningsByResourcesSelector = (state: ValidationState) => problemsByResourcesSelector(state, 'warning');

export const problemsByResourceSelector = createSelector(
  [
    (state: ValidationState, _resource?: string, level?: RuleLevel) => {
      return problemsByResourcesSelector(state, level);
    },
    (_state: ValidationState, resource?: string) => resource,
  ],
  (problems, resource): ValidationResult[] => (!resource ? [] : problems[resource] ?? [])
);

export const errorsByResourceSelector = (state: ValidationState, resource?: string) => {
  return problemsByResourceSelector(state, resource, 'error');
};
export const warningsByResourceSelector = (state: ValidationState, resource?: string) => {
  return problemsByResourceSelector(state, resource, 'warning');
};

/* * * * * * * * * * * * * * * * * *
 * Problems by file path
 * * * * * * * * * * * * * * * * * */
export const problemsByFilePathsSelector = createSelector(
  [(state: ValidationState) => problemsSelector(state), (_: ValidationState, level?: RuleLevel) => level],
  (problems, level): Record<string, ValidationResult[] | undefined> => {
    const problemsByFile: Map<string, ValidationResult[]> = new Map();

    problems.forEach(problem => {
      if (level && (problem.level ?? 'warning') !== level) {
        return;
      }

      const filePath = getFileId(problem);

      if (filePath === undefined) {
        return;
      }

      if (!problemsByFile.has(filePath)) {
        problemsByFile.set(filePath, []);
      }

      problemsByFile.get(filePath)?.push(problem);
    });

    return Object.fromEntries(problemsByFile);
  }
);

export const errorsByFilePathsSelector = (state: ValidationState) => problemsByFilePathsSelector(state, 'error');
export const warningsByFilePathsSelector = (state: ValidationState) => problemsByFilePathsSelector(state, 'warning');

export const problemsByFilePathSelector = createSelector(
  [
    (state: ValidationState, _path: string, level?: RuleLevel) => problemsByFilePathsSelector(state, level),
    (_state: ValidationState, path?: string) => path,
  ],
  (problems, path): ValidationResult[] => (!path ? [] : problems[path] ?? [])
);

export const errorsByFilePathSelector = (state: ValidationState, path: string) => {
  return problemsByFilePathSelector(state, path, 'error');
};

export const warningsByFilePathSelector = (state: ValidationState, path: string) => {
  return problemsByFilePathSelector(state, path, 'warning');
};

/* * * * * * * * * * * * * * * * * *
 * Problems by rule
 * * * * * * * * * * * * * * * * * */

export const problemsByRulesSelector = createSelector(
  [(state: ValidationState) => problemsSelector(state), (_: ValidationState, level?: RuleLevel) => level],
  (problems, level): Record<string, ValidationResult[] | undefined> => {
    const problemsByRule: Map<string, ValidationResult[]> = new Map();

    problems.forEach(problem => {
      if (level && (problem.level ?? 'warning') !== level) {
        return;
      }

      const resourceId = getResourceId(problem);

      if (resourceId === undefined) {
        return;
      }

      if (!problemsByRule.has(problem.ruleId)) {
        problemsByRule.set(problem.ruleId, []);
      }

      problemsByRule.get(problem.ruleId)?.push(problem);
    });

    return Object.fromEntries(problemsByRule);
  }
);

/* * * * * * * * * * * * * * * * * *
 * Miscellaneous
 * * * * * * * * * * * * * * * * * */

export const pluginMetadataSelector = createSelector(
  [(state: ValidationState) => state.metadata, (state: ValidationState, plugin?: string) => plugin],
  (metadata, plugin) => (!plugin ? undefined : metadata?.[plugin])
);

export const pluginRulesSelector = createSelector(
  [(state: ValidationState) => state.rules, (state: ValidationState, plugin?: string) => plugin],
  (rules, plugin) => (!plugin ? [] : rules?.[plugin] ?? [])
);

export const opaRuleCountSelector = (state: ValidationState) => {
  const pluginMetadata = pluginMetadataSelector(state, 'open-policy-agent');
  if (!pluginMetadata?.configuration.enabled) return 0;

  const rules = pluginRulesSelector(state, 'open-policy-agent');

  return rules.reduce((sum: number, rule) => {
    const value: number = rule.configuration.enabled ? 1 : 0;
    return sum + value;
  }, 0);
};

export const pluginEnabledSelector = createSelector(
  (state: RootState, id: string) => state.validation.config?.plugins?.[id],
  (_: RootState, id: string) => id,
  (_config, id): boolean => VALIDATOR.getPlugin(id)?.enabled ?? false
);

export const problemFilePathAndRangeSelector = createSelector(
  (state: ValidationState) => state.validationOverview.selectedProblem?.problem ?? null,
  (problem: ValidationResult | null) => {
    if (!problem) {
      return {filePath: '', range: undefined};
    }

    const location = getFileLocation(problem);
    const filePath = location.physicalLocation?.artifactLocation?.uri ?? '';
    const region = location.physicalLocation?.region;

    if (!region) {
      return {filePath, range: undefined};
    }

    const range: MonacoRange = {
      endColumn: region.endColumn,
      endLineNumber: region.endLine,
      startColumn: region.startColumn,
      startLineNumber: region.startLine,
    };

    return {filePath, range};
  }
);

export const problemResourceIdAndRangeSelector = createSelector(
  (state: ValidationState) => state.validationOverview.selectedProblem?.problem ?? null,
  (problem: ValidationResult | null) => {
    if (!problem) {
      return {resourceId: '', range: undefined};
    }

    const resourceId = getResourceId(problem) ?? '';
    const location = getResourceLocation(problem);
    const region = location.physicalLocation?.region;

    if (!region) {
      return {resourceId, range: undefined};
    }

    const range: MonacoRange = {
      endColumn: region.endColumn,
      endLineNumber: region.endLine,
      startColumn: region.startColumn,
      startLineNumber: region.startLine,
    };

    return {resourceId, range};
  }
);
