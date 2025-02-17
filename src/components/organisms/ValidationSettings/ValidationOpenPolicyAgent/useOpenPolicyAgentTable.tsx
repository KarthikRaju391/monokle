import {shell} from 'electron';

import {useCallback, useMemo} from 'react';

import {Switch, Tooltip} from 'antd';
import {ColumnsType} from 'antd/lib/table';

import styled from 'styled-components';

import {TOOLTIP_DELAY, VALIDATION_HIDING_LABELS_WIDTH} from '@constants/constants';

import {useAppDispatch} from '@redux/hooks';
import {changeRuleLevel, toggleRule} from '@redux/validation/validation.slice';

import {Icon, IconNames} from '@monokle/components';
import {PluginMetadataWithConfig} from '@monokle/validation';
import type {Rule} from '@shared/models/validation';
import {Colors} from '@shared/styles/colors';

import ValidationLevelSelect from './ValidationLevelSelect';
import * as S from './ValidationOpenPolicyAgentTable.styled';

export function useOpenPolicyAgentTable(plugin: PluginMetadataWithConfig, width: number) {
  const dispatch = useAppDispatch();

  const handleToggle = useCallback(
    (rule: Rule) => {
      dispatch(toggleRule({plugin: 'open-policy-agent', rule: rule.name}));
    },
    [dispatch]
  );

  const changeLevelHandler = useCallback(
    (rule: Rule, level: 'error' | 'warning' | 'default') => {
      dispatch(
        changeRuleLevel({
          plugin: 'open-policy-agent',
          rule: rule.name,
          level,
        })
      );
    },
    [dispatch]
  );

  const columns: ColumnsType<Rule> = useMemo(() => {
    return [
      {
        key: 'description',
        title: 'Description',
        dataIndex: 'name',
        render: (_value, rule) => {
          const {fullDescription, id, learnMoreUrl, shortDescription} = rule;

          return (
            <Tooltip
              mouseEnterDelay={TOOLTIP_DELAY}
              title={
                <p>
                  {fullDescription} {learnMoreUrl && <a onClick={() => shell.openExternal(learnMoreUrl)}>Learn more</a>}
                </p>
              }
              placement="bottomLeft"
              overlayStyle={{maxWidth: '500px'}}
            >
              {shortDescription} <S.RuleId>{id}</S.RuleId>
            </Tooltip>
          );
        },
      },
      {
        key: 'severity',
        title: `${width < VALIDATION_HIDING_LABELS_WIDTH ? '' : 'Severity'}`,
        dataIndex: 'severity',
        ...(width >= VALIDATION_HIDING_LABELS_WIDTH && {
          sorter: (a, b) => SEVERITY_ORDER_MAP[a.severity] - SEVERITY_ORDER_MAP[b.severity],
        }),
        render: (_value, record) => (
          <Icon
            name={SEVERITY_ICON_MAP[record.severity].name}
            style={{height: 15, width: 15, paddingTop: 15, color: SEVERITY_ICON_MAP[record.severity].color}}
          />
        ),
      },
      {
        key: 'enabled',
        title: `${width < VALIDATION_HIDING_LABELS_WIDTH ? '' : 'Enabled?'}`,
        render: (_value, rule) => {
          return (
            <Box>
              <Switch
                checked={rule.enabled}
                disabled={!plugin?.configuration.enabled ?? true}
                onChange={() => handleToggle(rule)}
              />

              <ValidationLevelSelect
                rule={rule}
                disabled={!plugin.configuration.enabled || !rule.enabled}
                handleChange={changeLevelHandler}
              />
            </Box>
          );
        },
        ...(width >= VALIDATION_HIDING_LABELS_WIDTH && {
          sorter: (a, b) => (a.enabled === b.enabled ? 0 : a.enabled ? -1 : 1),
        }),
      },
    ];
  }, [changeLevelHandler, handleToggle, plugin.configuration.enabled, width]);

  return columns;
}

const Box = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
`;

const SEVERITY_ORDER_MAP: Record<'low' | 'medium' | 'high', number> = {
  low: 1,
  medium: 2,
  high: 3,
};

const SEVERITY_ICON_MAP: Record<'low' | 'medium' | 'high', {name: IconNames; color: Colors}> = {
  high: {name: 'severity-high', color: Colors.red7},
  medium: {name: 'severity-medium', color: Colors.red7},
  low: {name: 'severity-low', color: Colors.green7},
};
