import {useCallback} from 'react';

import {isEmpty} from 'lodash';

import {setActiveTab, setDashboardSelectedResourceId} from '@redux/dashboard';
import {useAppDispatch} from '@redux/hooks';
import {setMonacoEditor} from '@redux/reducers/ui';

import {useValidationLevel} from '@hooks/useValidationLevel';

import {ValidationPopover} from '@monokle/components';
import {ValidationResult, getResourceLocation} from '@monokle/validation';
import {MonacoRange} from '@shared/models/ui';

type IProps = {
  resourceId: string;
};

const ErrorCell: React.FC<IProps> = props => {
  const {resourceId} = props;

  const {level, errors, warnings} = useValidationLevel(resourceId);
  const dispatch = useAppDispatch();

  const onMessageClickHandler = useCallback(
    (result: ValidationResult) => {
      dispatch(setDashboardSelectedResourceId(resourceId));
      dispatch(setActiveTab('Manifest'));

      const location = getResourceLocation(result);
      const region = location.physicalLocation?.region;

      if (!region) return;

      const targetOutgoingRefRange: MonacoRange = {
        endColumn: region.endColumn,
        endLineNumber: region.endLine,
        startColumn: region.startColumn,
        startLineNumber: region.startLine,
      };

      setImmediate(() => {
        dispatch(setMonacoEditor({selection: {type: 'resource', resourceId, range: targetOutgoingRefRange}}));
      });
    },
    [dispatch, resourceId]
  );

  if (isEmpty(errors) && isEmpty(warnings)) {
    return <span style={{padding: '2px 4px'}}>-</span>;
  }

  return (
    <div
      onClick={e => {
        e.stopPropagation();
      }}
    >
      <ValidationPopover
        level={level}
        results={[...errors, ...warnings]}
        onMessageClickHandler={onMessageClickHandler}
      />
    </div>
  );
};

export default ErrorCell;
