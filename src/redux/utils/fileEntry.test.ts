import path from "path";
import {AppConfig} from '@models/appconfig';
import {initialState} from '@redux/initialState';
import {FileMapType, ResourceMapType} from '@models/appstate';
import {getK8sResources} from '@redux/utils/resource';
import {HelmChart} from '@models/helm';
import {createFileEntry, getResourcesForPath, readFiles} from './fileEntry';

function createSafePath(originalPath: string) {
  return originalPath.replaceAll('/', path.sep);
}

test('create-file-entry', () => {
  let e = createFileEntry(createSafePath('/a/very/long/path'));
  expect(e.highlight).toBeFalsy();
  expect(e.selected).toBeFalsy();
  expect(e.expanded).toBeFalsy();
  expect(e.excluded).toBeFalsy();
  expect(e.name).toBe('path');
  expect(e.filePath).toBe(createSafePath('/a/very/long/path'));
  expect(e.children).toBeUndefined();
});

function readManifests(rootFolder: string) {
  const appConfig: AppConfig = initialState.appConfig;
  const resourceMap: ResourceMapType = {};
  const fileMap: FileMapType = {};
  const helmCharts: HelmChart[] = [];

  const files = readFiles(rootFolder, appConfig, resourceMap, fileMap, helmCharts);
  return {resourceMap, fileMap, files, helmCharts};
}

test('read-files', () => {
  const {resourceMap, fileMap, files} = readManifests(createSafePath('src/redux/utils/__test__/manifests/argo-rollouts'));

  expect(files.length).toBe(7);
  expect(Object.values(fileMap).length).toBe(27);
  expect(getK8sResources(resourceMap, 'Kustomization').length).toBe(5);
  expect(getResourcesForPath(createSafePath('/base/argo-rollouts-aggregate-roles.yaml'), resourceMap).length).toBe(3);
});

test('read-folder-with-one-file', () => {
  const {
    resourceMap,
    fileMap,
    files,
    helmCharts,
  } = readManifests(createSafePath('src/redux/utils/__test__/manifests/single'));

  expect(files.length).toBe(1);
  expect(Object.values(fileMap).length).toBe(2);
  expect(Object.values(resourceMap).length).toBe(1);
  expect(helmCharts.length).toBe(0);

});

test('read-folder-with-helm-chart', () => {
  const {
    resourceMap,
    fileMap,
    files,
    helmCharts,
  } = readManifests(createSafePath('src/redux/utils/__test__/helm-charts/subway'));

  expect(files.length).toBe(11);
  expect(Object.values(fileMap).length).toBe(22);
  expect(Object.values(resourceMap).length).toBe(0);
  expect(helmCharts.length).toBe(1);
  expect(helmCharts[0].valueFiles.length).toBe(8);
  expect(helmCharts[0].name).toBe('subway');
  expect(fileMap[helmCharts[0].filePath].name).toBe('Chart.yaml');

});
