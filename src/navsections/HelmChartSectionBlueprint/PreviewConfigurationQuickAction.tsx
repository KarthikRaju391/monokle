import {useCallback} from 'react';

import {Popconfirm} from 'antd';

import {DeleteOutlined, EditOutlined} from '@ant-design/icons';

import styled from 'styled-components';

import {DeletePreviewConfigurationTooltip} from '@constants/tooltips';

import {useAppDispatch, useAppSelector} from '@redux/hooks';
import {openPreviewConfigurationEditor} from '@redux/reducers/main';
import {startPreview} from '@redux/services/preview';
import {deletePreviewConfiguration} from '@redux/thunks/previewConfiguration';

import {ItemCustomComponentProps} from '@shared/models/navigator';
import {Colors} from '@shared/styles/colors';

const StyledButton = styled.span<{isItemSelected: boolean}>`
  margin-right: 15px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  color: ${props => (props.isItemSelected ? Colors.blackPure : Colors.blue6)};
`;

const PreviewConfigurationQuickAction: React.FC<ItemCustomComponentProps> = props => {
  const {itemInstance} = props;
  const dispatch = useAppDispatch();

  const previewConfiguration = useAppSelector(
    state => state.config.projectConfig?.helm?.previewConfigurationMap?.[itemInstance.id]
  );

  const helmChart = useAppSelector(state =>
    previewConfiguration
      ? Object.values(state.main.helmChartMap).find(h => h.filePath === previewConfiguration.helmChartFilePath)
      : undefined
  );

  const onClickRun = useCallback(() => {
    if (!previewConfiguration) {
      return;
    }
    startPreview({type: 'helm-config', configId: previewConfiguration.id}, dispatch);
  }, [dispatch, previewConfiguration]);

  const onClickEdit = useCallback(() => {
    if (!previewConfiguration || !helmChart) {
      return;
    }
    dispatch(
      openPreviewConfigurationEditor({helmChartId: helmChart.id, previewConfigurationId: previewConfiguration.id})
    );
  }, [previewConfiguration, helmChart, dispatch]);

  const onClickDelete = useCallback(() => {
    if (!previewConfiguration) {
      return;
    }
    dispatch(deletePreviewConfiguration(previewConfiguration.id));
  }, [previewConfiguration, dispatch]);

  if (!previewConfiguration || !helmChart) {
    return null;
  }

  return (
    <>
      <StyledButton isItemSelected={itemInstance.isSelected} onClick={() => onClickRun()}>
        Preview
      </StyledButton>
      <StyledButton isItemSelected={itemInstance.isSelected} onClick={() => onClickEdit()}>
        <EditOutlined />
      </StyledButton>
      <Popconfirm title={DeletePreviewConfigurationTooltip} onConfirm={() => onClickDelete()}>
        <StyledButton isItemSelected={itemInstance.isSelected}>
          <DeleteOutlined />
        </StyledButton>
      </Popconfirm>
    </>
  );
};

export default PreviewConfigurationQuickAction;
