import {useCallback, useMemo} from 'react';

import {Modal} from 'antd';

import {ExclamationCircleOutlined} from '@ant-design/icons';

import path from 'path';
import styled from 'styled-components';

import {isInClusterModeSelector} from '@redux/appConfig';
import {useAppDispatch, useAppSelector} from '@redux/hooks';
import {selectFile} from '@redux/reducers/main';
import {setLeftMenuSelection} from '@redux/reducers/ui';
import {isInPreviewModeSelectorNew} from '@redux/selectors';
import {setRootFolder} from '@redux/thunks/setRootFolder';

import {ContextMenu, Dots} from '@atoms';

import {useCreate, useDuplicate, useFilterByFileOrFolder, useProcessing, useRename} from '@hooks/fileTreeHooks';

import {deleteFileEntry, dispatchDeleteAlert} from '@utils/files';

import {ROOT_FILE_ENTRY} from '@shared/constants/fileEntry';
import {HelmValuesFile} from '@shared/models/helm';
import {ItemCustomComponentProps} from '@shared/models/navigator';
import {Colors} from '@shared/styles/colors';
import {showItemInFolder} from '@shared/utils/shell';

const StyledActionsMenuIconContainer = styled.span<{isSelected: boolean}>`
  cursor: pointer;
  padding: 8px;
  display: flex;
  align-items: center;
`;

// TODO: temporary solution for renaming value file
const DEFAULT_HELM_VALUE: HelmValuesFile = {
  filePath: '',
  id: '',
  name: '',
  helmChartId: '',
  values: [],
};

const HelmChartContextMenu: React.FC<ItemCustomComponentProps> = props => {
  const {itemInstance} = props;

  const dispatch = useAppDispatch();
  const rootFolderPath = useAppSelector(state => state.main.fileMap[ROOT_FILE_ENTRY].filePath);
  const fileOrFolderContainedInFilter = useAppSelector(state => state.main.resourceFilter.fileOrFolderContainedIn);
  const helmChartMap = useAppSelector(state => state.main.helmChartMap);
  const helmTemplatesMap = useAppSelector(state => state.main.helmTemplatesMap);
  const helmValuesMap = useAppSelector(state => state.main.helmValuesMap);
  const isInPreviewMode = useAppSelector(isInPreviewModeSelectorNew);
  const isInClusterMode = useAppSelector(isInClusterModeSelector);
  const osPlatform = useAppSelector(state => state.config.osPlatform);
  const selection = useAppSelector(state => state.main.selection);

  const {onCreateResource} = useCreate();
  const {onDuplicate} = useDuplicate();
  const {onFilterByFileOrFolder} = useFilterByFileOrFolder();
  const {onRename} = useRename();

  const refreshFolder = useCallback(() => setRootFolder(rootFolderPath), [rootFolderPath]);
  const {onExcludeFromProcessing} = useProcessing(refreshFolder);

  const helmItem = useMemo(
    () =>
      helmValuesMap[itemInstance.id] ||
      helmChartMap[itemInstance.id] ||
      helmTemplatesMap[itemInstance.id] ||
      DEFAULT_HELM_VALUE,
    [helmChartMap, helmTemplatesMap, helmValuesMap, itemInstance.id]
  );

  const fileEntry = useAppSelector(state => state.main.fileMap[helmItem.filePath]);

  const absolutePath = useMemo(() => path.join(rootFolderPath, helmItem.filePath), [rootFolderPath, helmItem]);
  const basename = useMemo(
    () => (osPlatform === 'win32' ? path.win32.basename(absolutePath) : path.basename(absolutePath)),
    [absolutePath, osPlatform]
  );
  const dirname = useMemo(
    () => (osPlatform === 'win32' ? path.win32.dirname(absolutePath) : path.dirname(absolutePath)),
    [absolutePath, osPlatform]
  );
  const isHelmValueSelected = useMemo(
    () => selection?.type === 'helm.values.file' && selection.valuesFileId === helmItem.id,
    [helmItem.id, selection]
  );
  const isRoot = useMemo(() => helmItem.filePath === ROOT_FILE_ENTRY, [helmItem.filePath]);
  const platformFileManagerName = useMemo(() => (osPlatform === 'darwin' ? 'Finder' : 'Explorer'), [osPlatform]);
  const target = useMemo(
    () => (isRoot ? ROOT_FILE_ENTRY : helmItem.filePath.replace(path.sep, '')),
    [helmItem.filePath, isRoot]
  );

  const isFiltered = useMemo(
    () => !helmItem.filePath.startsWith(fileOrFolderContainedInFilter || ''),
    [fileOrFolderContainedInFilter, helmItem.filePath]
  );
  const menuItems = useMemo(
    () => [
      {
        key: 'show_file',
        label: 'Go to file',
        disabled: isInPreviewMode || isInClusterMode,
        onClick: () => {
          if (!helmItem) {
            return;
          }

          dispatch(setLeftMenuSelection('explorer'));
          dispatch(selectFile({filePath: helmItem.filePath}));
        },
      },
      {key: 'divider-1', type: 'divider'},
      {
        key: 'create_resource',
        label: 'Add Resource',
        disabled: true,
        onClick: () => {
          onCreateResource({targetFile: target});
        },
      },
      {key: 'divider-2', type: 'divider'},
      {
        key: 'filter_on_this_file',
        label:
          fileOrFolderContainedInFilter && helmItem.filePath === fileOrFolderContainedInFilter
            ? 'Remove from filter'
            : 'Filter on this file',
        disabled: true,
        onClick: () => {
          if (isRoot || (fileOrFolderContainedInFilter && helmItem.filePath === fileOrFolderContainedInFilter)) {
            onFilterByFileOrFolder(undefined);
          } else {
            onFilterByFileOrFolder(helmItem.filePath);
          }
        },
      },
      {
        key: 'add_to_files_exclude',
        label: 'Add to Files: Exclude',
        disabled: true,
        onClick: () => {
          onExcludeFromProcessing(helmItem.filePath);
        },
      },
      {key: 'divider-3', type: 'divider'},
      {
        key: 'copy_full_path',
        label: 'Copy Path',
        onClick: () => {
          navigator.clipboard.writeText(absolutePath);
        },
      },
      {
        key: 'copy_relative_path',
        label: 'Copy Relative Path',
        onClick: () => {
          navigator.clipboard.writeText(helmItem.filePath);
        },
      },
      {key: 'divider-4', type: 'divider'},
      {
        key: 'duplicate_entity',
        label: 'Duplicate',
        disabled: isInPreviewMode || isInClusterMode,
        onClick: () => {
          onDuplicate(absolutePath, basename, dirname);
        },
      },
      {
        key: 'rename_entity',
        label: 'Rename',
        disabled: isInPreviewMode || isInClusterMode,
        onClick: () => {
          onRename(absolutePath);
        },
      },
      {
        key: 'delete_entity',
        label: 'Delete',
        disabled: isInPreviewMode || isInClusterMode,
        onClick: () => {
          Modal.confirm({
            title: `Are you sure you want to delete "${basename}"?`,
            icon: <ExclamationCircleOutlined />,
            onOk() {
              deleteFileEntry(fileEntry).then(result => dispatchDeleteAlert(dispatch, result));
            },
          });
        },
      },
      {key: 'divider-5', type: 'divider'},
      {
        key: 'reveal_in_finder',
        label: `Reveal in ${platformFileManagerName}`,
        onClick: () => {
          showItemInFolder(absolutePath);
        },
      },
    ],
    [
      absolutePath,
      basename,
      dirname,
      dispatch,
      fileOrFolderContainedInFilter,
      helmItem,
      isInPreviewMode,
      isInClusterMode,
      isRoot,
      onCreateResource,
      onDuplicate,
      onExcludeFromProcessing,
      onFilterByFileOrFolder,
      onRename,
      platformFileManagerName,
      target,
      fileEntry,
    ]
  );

  if (isFiltered) {
    return null;
  }

  return (
    <ContextMenu items={menuItems}>
      <StyledActionsMenuIconContainer isSelected={itemInstance.isSelected}>
        <Dots color={isHelmValueSelected ? Colors.blackPure : undefined} />
      </StyledActionsMenuIconContainer>
    </ContextMenu>
  );
};

export default HelmChartContextMenu;
