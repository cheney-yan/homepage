/* eslint-disable no-console */
import { promises as fs } from "fs";
import path from "path";

import yaml from "js-yaml";

import checkAndCopyConfig, { getSettings } from "utils/config/config";
import { servicesFromConfig, servicesFromDocker, cleanServiceGroups } from "utils/config/service-helpers";
import { cleanWidgetGroups, widgetsFromConfig } from "utils/config/widget-helpers";
async function filterBookmarks(bookmarks, filter) {
  let bks = bookmarks.reduce(function (filtered, bookmark) {
    let bk = bookmark.bookmarks.filter(item => {
      if (item.tags == undefined || filter == undefined)
        return true
      return item.tags?.includes(filter)
    })
    if (bk.length > 0) {
      filtered.push({
        name: bookmark.name,
        bookmarks: bk
      })
    }
    return filtered;
  }, []);
  return bks
}
export async function bookmarksResponse(filter) {
  checkAndCopyConfig("bookmarks.yaml");

  const bookmarksYaml = path.join(process.cwd(), "config", "bookmarks.yaml");
  const fileContents = await fs.readFile(bookmarksYaml, "utf8");
  const bookmarks = yaml.load(fileContents);

  if (!bookmarks) return [];
  // map easy to write YAML objects into easy to consume JS arrays
  const bookmarksArray = bookmarks.map((group) => ({
    name: Object.keys(group)[0],
    bookmarks: group[Object.keys(group)[0]].map((entries) => ({
      name: Object.keys(entries)[0],
      ...entries[Object.keys(entries)[0]][0],
    })),
  }));
  return await filterBookmarks(bookmarksArray, filter);
}

export async function widgetsResponse() {
  let configuredWidgets;

  try {
    configuredWidgets = cleanWidgetGroups(await widgetsFromConfig());
  } catch (e) {
    console.error("Failed to load widgets, please check widgets.yaml for errors or remove example entries.");
    if (e) console.error(e);
    configuredWidgets = [];
  }

  return configuredWidgets;
}

export async function servicesResponse() {
  let discoveredServices;
  let configuredServices;
  let initialSettings;

  try {
    discoveredServices = cleanServiceGroups(await servicesFromDocker());
  } catch (e) {
    console.error("Failed to discover services, please check docker.yaml for errors or remove example entries.");
    if (e) console.error(e);
    discoveredServices = [];
  }

  try {
    configuredServices = cleanServiceGroups(await servicesFromConfig());
  } catch (e) {
    console.error("Failed to load services.yaml, please check for errors");
    if (e) console.error(e);
    configuredServices = [];
  }

  try {
    initialSettings = await getSettings();
  } catch (e) {
    console.error("Failed to load settings.yaml, please check for errors");
    if (e) console.error(e);
    initialSettings = {};
  }

  const mergedGroupsNames = [
    ...new Set([discoveredServices.map((group) => group.name), configuredServices.map((group) => group.name)].flat()),
  ];

  const sortedGroups = [];
  const unsortedGroups = [];
  const definedLayouts = initialSettings.layout ? Object.keys(initialSettings.layout) : null;

  mergedGroupsNames.forEach((groupName) => {
    const discoveredGroup = discoveredServices.find((group) => group.name === groupName) || { services: [] };
    const configuredGroup = configuredServices.find((group) => group.name === groupName) || { services: [] };

    const mergedGroup = {
      name: groupName,
      services: [...discoveredGroup.services, ...configuredGroup.services].filter((service) => service),
    };

    if (definedLayouts) {
      const layoutIndex = definedLayouts.findIndex(layout => layout === mergedGroup.name);
      if (layoutIndex > -1) sortedGroups[layoutIndex] = mergedGroup;
      else unsortedGroups.push(mergedGroup);
    } else {
      unsortedGroups.push(mergedGroup);
    }
  });

  return [...sortedGroups.filter(g => g), ...unsortedGroups];
}
