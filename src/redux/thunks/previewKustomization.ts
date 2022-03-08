import {ipcRenderer} from 'electron';

import {createAsyncThunk} from '@reduxjs/toolkit';

import log from 'loglevel';
import path from 'path';

import {ROOT_FILE_ENTRY} from '@constants/constants';

import {ProjectConfig} from '@models/appconfig';
import {AppDispatch} from '@models/appdispatch';
import {KustomizeCommandType} from '@models/kustomize';
import {RootState} from '@models/rootstate';

import {SetPreviewDataPayload} from '@redux/reducers/main';
import {currentConfigSelector} from '@redux/selectors';
import {getK8sVersion} from '@redux/services/projectConfig';
import {createPreviewResult, createRejectionWithAlert} from '@redux/thunks/utils';

import {DO_KUSTOMIZE_PREVIEW, trackEvent} from '@utils/telemetry';

export type KustomizeCommandOptions = {
  folder: string;
  kustomizeCommand: KustomizeCommandType;
  enableHelm: boolean;
};

/**
 * Thunk to preview kustomizations
 */

export const previewKustomization = createAsyncThunk<
  SetPreviewDataPayload,
  string,
  {
    dispatch: AppDispatch;
    state: RootState;
  }
>('main/previewKustomization', async (resourceId, thunkAPI) => {
  const state = thunkAPI.getState().main;
  const projectConfig = currentConfigSelector(thunkAPI.getState());
  const k8sVersion = getK8sVersion(projectConfig);
  const userDataDir = thunkAPI.getState().config.userDataDir;
  const resource = state.resourceMap[resourceId];

  if (resource && resource.filePath) {
    const rootFolder = state.fileMap[ROOT_FILE_ENTRY].filePath;
    const folder = path.join(rootFolder, resource.filePath.substr(0, resource.filePath.lastIndexOf(path.sep)));

    log.info(`previewing ${resource.id} in folder ${folder}`);
    const result = await runKustomize(folder, projectConfig);

    trackEvent(DO_KUSTOMIZE_PREVIEW);

    if (result.error) {
      return createRejectionWithAlert(thunkAPI, 'Kustomize Error', result.error);
    }

    if (result.stdout) {
      return createPreviewResult(
        k8sVersion,
        String(userDataDir),
        result.stdout,
        resource.id,
        'Kustomize Preview',
        state.resourceRefsProcessingOptions
      );
    }
  }

  return {};
});

/**
 * Invokes kustomize in main thread
 */

function runKustomize(folder: string, projectConfig: ProjectConfig): any {
  return new Promise(resolve => {
    ipcRenderer.once('kustomize-result', (event, arg) => {
      resolve(arg);
    });
    const kustomizeCommand = projectConfig?.settings?.kustomizeCommand || 'kubectl';
    const enableHelmWithKustomize = projectConfig?.settings?.enableHelmWithKustomize || false;

    ipcRenderer.send('run-kustomize', {
      folder,
      kustomizeCommand,
      enableHelm: enableHelmWithKustomize,
    } as KustomizeCommandOptions);
  });
}
