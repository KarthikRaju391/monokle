import styled from 'styled-components';

import {Colors} from '@shared/styles/colors';

export const RemoteInputContainer = styled.div`
  margin: 14px;
  color: ${Colors.grey9};
`;

export const RemoteInputFlex = styled.div`
  display: flex;
  gap: 10px;

  .ant-form-item {
    margin-bottom: 0px;
  }
`;

export const RemoteInputInfo = styled.div`
  margin-bottom: 12px;
`;
