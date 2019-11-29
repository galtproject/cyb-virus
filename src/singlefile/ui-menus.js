/*
 * Copyright ©️ 2018 Galt•Project Society Construction and Terraforming Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka)
 *
 * Copyright ©️ 2018 Galt•Core Blockchain Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka) by
 *  [Basic Agreement](ipfs/QmaCiXUmSrP16Gz8Jdzq6AJESY1EAANmmwha15uR3c1bsS)).
 */

/* global browser, singlefile, URL */

singlefile.extension.ui.bg.menus = (() => {
  const menus = browser.menus || browser.contextMenus;
  const BROWSER_MENUS_API_SUPPORTED = menus && menus.onClicked && menus.create && menus.update && menus.removeAll;
  const MENU_ID_SAVE_PAGE = 'save-page';
  const MENU_ID_SELECT_PROFILE = 'select-profile';
  const MENU_ID_SELECT_PROFILE_PREFIX = 'select-profile-';
  const MENU_ID_ASSOCIATE_WITH_PROFILE = 'associate-with-profile';
  const MENU_ID_ASSOCIATE_WITH_PROFILE_PREFIX = 'associate-with-profile-';
  const MENU_ID_SAVE_SELECTED = 'save-selected';
  const MENU_ID_SAVE_FRAME = 'save-frame';
  const MENU_ID_SAVE_TABS = 'save-tabs';
  const MENU_ID_SAVE_SELECTED_TABS = 'save-selected-tabs';
  const MENU_ID_SAVE_UNPINNED_TABS = 'save-unpinned-tabs';
  const MENU_ID_SAVE_ALL_TABS = 'save-all-tabs';
  const MENU_ID_BUTTON_SAVE_SELECTED_TABS = 'button-' + MENU_ID_SAVE_SELECTED_TABS;
  const MENU_ID_BUTTON_SAVE_UNPINNED_TABS = 'button-' + MENU_ID_SAVE_UNPINNED_TABS;
  const MENU_ID_BUTTON_SAVE_ALL_TABS = 'button-' + MENU_ID_SAVE_ALL_TABS;
  const MENU_ID_AUTO_SAVE = 'auto-save';
  const MENU_ID_AUTO_SAVE_DISABLED = 'auto-save-disabled';
  const MENU_ID_AUTO_SAVE_TAB = 'auto-save-tab';
  const MENU_ID_AUTO_SAVE_UNPINNED = 'auto-save-unpinned';
  const MENU_ID_AUTO_SAVE_ALL = 'auto-save-all';
  const MENU_CREATE_DOMAIN_RULE_MESSAGE = browser.i18n.getMessage('menuCreateDomainRule');
  const MENU_UPDATE_RULE_MESSAGE = browser.i18n.getMessage('menuUpdateRule');
  const MENU_SAVE_PAGE_MESSAGE = browser.i18n.getMessage('menuSavePage');
  const MENU_SAVE_SELECTION_MESSAGE = browser.i18n.getMessage('menuSaveSelection');
  const MENU_SAVE_FRAME_MESSAGE = browser.i18n.getMessage('menuSaveFrame');
  const MENU_SAVE_TABS_MESSAGE = browser.i18n.getMessage('menuSaveTabs');
  const MENU_SAVE_SELECTED_TABS_MESSAGE = browser.i18n.getMessage('menuSaveSelectedTabs');
  const MENU_SAVE_UNPINNED_TABS_MESSAGE = browser.i18n.getMessage('menuSaveUnpinnedTabs');
  const MENU_SAVE_ALL_TABS_MESSAGE = browser.i18n.getMessage('menuSaveAllTabs');
  const MENU_SELECT_PROFILE_MESSAGE = browser.i18n.getMessage('menuSelectProfile');
  const PROFILE_DEFAULT_SETTINGS_MESSAGE = browser.i18n.getMessage('profileDefaultSettings');
  const MENU_AUTOSAVE_MESSAGE = browser.i18n.getMessage('menuAutoSave');
  const MENU_AUTOSAVE_DISABLED_MESSAGE = browser.i18n.getMessage('menuAutoSaveDisabled');
  const MENU_AUTOSAVE_TAB_MESSAGE = browser.i18n.getMessage('menuAutoSaveTab');
  const MENU_AUTOSAVE_UNPINNED_TABS_MESSAGE = browser.i18n.getMessage('menuAutoSaveUnpinnedTabs');
  const MENU_AUTOSAVE_ALL_TABS_MESSAGE = browser.i18n.getMessage('menuAutoSaveAllTabs');

  const menusCheckedState = new Map();
  const menusTitleState = new Map();
  let menusVisibleState;
  let profileIndexes = new Map();
  let menusCreated, pendingRefresh;
  initialize();
  return {
    onMessage,
    onTabCreated: refreshTab,
    onTabActivated: refreshTab,
    onTabUpdated: (tabId, changeInfo, tab) => refreshTab(tab),
    refreshTab: createMenus,
  };

  function onMessage(message) {
    if (message.method.endsWith('refreshMenu')) {
      createMenus();
      return Promise.resolve({});
    }
  }

  async function createMenus(tab) {
    // disable single page menus
    return;
    const config = singlefile.extension.core.bg.config;
    const [profiles, tabsData] = await Promise.all([config.getProfiles(), singlefile.extension.core.bg.tabsData.get()]);
    const options = await config.getOptions(tab && tab.url);
    if (BROWSER_MENUS_API_SUPPORTED && options) {
      const pageContextsEnabled = ['page', 'frame', 'image', 'link', 'video', 'audio', 'selection'];
      const defaultContextsDisabled = [];
      if (options.browserActionMenuEnabled) {
        defaultContextsDisabled.push('browser_action');
      }
      if (options.tabMenuEnabled) {
        try {
          menus.create({
            id: 'temporary-id',
            contexts: ['tab'],
            title: 'title',
          });
          defaultContextsDisabled.push('tab');
          menus.create({
            id: MENU_ID_SAVE_PAGE,
            contexts: ['tab'],
            title: MENU_SAVE_PAGE_MESSAGE,
          });
        } catch (error) {
          options.tabMenuEnabled = false;
        }
      }
      await menus.removeAll();
      const defaultContextsEnabled = defaultContextsDisabled.concat(...pageContextsEnabled);
      const defaultContexts = options.contextMenuEnabled ? defaultContextsEnabled : defaultContextsDisabled;
      menus.create({
        id: MENU_ID_SAVE_PAGE,
        contexts: defaultContexts,
        title: MENU_SAVE_PAGE_MESSAGE,
      });
      if (options.contextMenuEnabled) {
        menus.create({
          id: 'separator-1',
          contexts: pageContextsEnabled,
          type: 'separator',
        });
        menus.create({
          id: MENU_ID_SAVE_SELECTED,
          contexts: pageContextsEnabled,
          title: MENU_SAVE_SELECTION_MESSAGE,
        });
        menus.create({
          id: MENU_ID_SAVE_FRAME,
          contexts: ['frame'],
          title: MENU_SAVE_FRAME_MESSAGE,
        });
      }
      menus.create({
        id: MENU_ID_SAVE_TABS,
        contexts: defaultContextsDisabled,
        title: MENU_SAVE_TABS_MESSAGE,
      });
      menus.create({
        id: MENU_ID_BUTTON_SAVE_SELECTED_TABS,
        contexts: defaultContextsDisabled,
        title: MENU_SAVE_SELECTED_TABS_MESSAGE,
        parentId: MENU_ID_SAVE_TABS,
      });
      menus.create({
        id: MENU_ID_BUTTON_SAVE_UNPINNED_TABS,
        contexts: defaultContextsDisabled,
        title: MENU_SAVE_UNPINNED_TABS_MESSAGE,
        parentId: MENU_ID_SAVE_TABS,
      });
      menus.create({
        id: MENU_ID_BUTTON_SAVE_ALL_TABS,
        contexts: defaultContextsDisabled,
        title: MENU_SAVE_ALL_TABS_MESSAGE,
        parentId: MENU_ID_SAVE_TABS,
      });
      if (options.contextMenuEnabled) {
        menus.create({
          id: MENU_ID_SAVE_SELECTED_TABS,
          contexts: pageContextsEnabled,
          title: MENU_SAVE_SELECTED_TABS_MESSAGE,
        });
        menus.create({
          id: MENU_ID_SAVE_UNPINNED_TABS,
          contexts: pageContextsEnabled,
          title: MENU_SAVE_UNPINNED_TABS_MESSAGE,
        });
        menus.create({
          id: MENU_ID_SAVE_ALL_TABS,
          contexts: pageContextsEnabled,
          title: MENU_SAVE_ALL_TABS_MESSAGE,
        });
        menus.create({
          id: 'separator-2',
          contexts: pageContextsEnabled,
          type: 'separator',
        });
      }
      if (Object.keys(profiles).length > 1) {
        menus.create({
          id: MENU_ID_SELECT_PROFILE,
          title: MENU_SELECT_PROFILE_MESSAGE,
          contexts: defaultContexts,
        });
        const defaultProfileId = MENU_ID_SELECT_PROFILE_PREFIX + 'default';
        const defaultProfileChecked = !tabsData.profileName || tabsData.profileName == config.DEFAULT_PROFILE_NAME;
        menus.create({
          id: defaultProfileId,
          type: 'radio',
          contexts: defaultContexts,
          title: PROFILE_DEFAULT_SETTINGS_MESSAGE,
          checked: defaultProfileChecked,
          parentId: MENU_ID_SELECT_PROFILE,
        });
        menusCheckedState.set(defaultProfileId, defaultProfileChecked);
        menus.create({
          id: MENU_ID_ASSOCIATE_WITH_PROFILE,
          title: MENU_CREATE_DOMAIN_RULE_MESSAGE,
          contexts: defaultContexts,
        });
        menusTitleState.set(MENU_ID_ASSOCIATE_WITH_PROFILE, MENU_CREATE_DOMAIN_RULE_MESSAGE);
        let rule;
        if (tab && tab.url) {
          rule = await config.getRule(tab.url);
        }
        const currentProfileId = MENU_ID_ASSOCIATE_WITH_PROFILE_PREFIX + 'current';
        const currentProfileIChecked = !rule || rule.profile == config.CURRENT_PROFILE_NAME;
        menus.create({
          id: currentProfileId,
          type: 'radio',
          contexts: defaultContexts,
          title: config.CURRENT_PROFILE_NAME,
          checked: currentProfileIChecked,
          parentId: MENU_ID_ASSOCIATE_WITH_PROFILE,
        });
        menusCheckedState.set(currentProfileId, currentProfileIChecked);

        const associatedDefaultProfileId = MENU_ID_ASSOCIATE_WITH_PROFILE_PREFIX + 'default';
        const associatedDefaultProfileChecked = Boolean(rule) && rule.profile == config.DEFAULT_PROFILE_NAME;
        menus.create({
          id: associatedDefaultProfileId,
          type: 'radio',
          contexts: defaultContexts,
          title: PROFILE_DEFAULT_SETTINGS_MESSAGE,
          checked: associatedDefaultProfileChecked,
          parentId: MENU_ID_ASSOCIATE_WITH_PROFILE,
        });
        menusCheckedState.set(associatedDefaultProfileId, associatedDefaultProfileChecked);
        profileIndexes = new Map();
        Object.keys(profiles).forEach((profileName, profileIndex) => {
          if (profileName != config.DEFAULT_PROFILE_NAME) {
            let profileId = MENU_ID_SELECT_PROFILE_PREFIX + profileIndex;
            let profileChecked = tabsData.profileName == profileName;
            menus.create({
              id: profileId,
              type: 'radio',
              contexts: defaultContexts,
              title: profileName,
              checked: profileChecked,
              parentId: MENU_ID_SELECT_PROFILE,
            });
            menusCheckedState.set(profileId, profileChecked);
            profileId = MENU_ID_ASSOCIATE_WITH_PROFILE_PREFIX + profileIndex;
            profileChecked = Boolean(rule) && rule.profile == profileName;
            menus.create({
              id: profileId,
              type: 'radio',
              contexts: defaultContexts,
              title: profileName,
              checked: profileChecked,
              parentId: MENU_ID_ASSOCIATE_WITH_PROFILE,
            });
            menusCheckedState.set(profileId, profileChecked);
            profileIndexes.set(profileName, profileIndex);
          }
        });
        if (options.contextMenuEnabled) {
          menus.create({
            id: 'separator-3',
            contexts: pageContextsEnabled,
            type: 'separator',
          });
        }
      }
      menus.create({
        id: MENU_ID_AUTO_SAVE,
        contexts: defaultContexts,
        title: MENU_AUTOSAVE_MESSAGE,
      });
      menus.create({
        id: MENU_ID_AUTO_SAVE_DISABLED,
        type: 'radio',
        title: MENU_AUTOSAVE_DISABLED_MESSAGE,
        contexts: defaultContexts,
        checked: true,
        parentId: MENU_ID_AUTO_SAVE,
      });
      menusCheckedState.set(MENU_ID_AUTO_SAVE_DISABLED, true);
      menus.create({
        id: MENU_ID_AUTO_SAVE_TAB,
        type: 'radio',
        title: MENU_AUTOSAVE_TAB_MESSAGE,
        contexts: defaultContexts,
        checked: false,
        parentId: MENU_ID_AUTO_SAVE,
      });
      menusCheckedState.set(MENU_ID_AUTO_SAVE_TAB, false);
      menus.create({
        id: MENU_ID_AUTO_SAVE_UNPINNED,
        type: 'radio',
        title: MENU_AUTOSAVE_UNPINNED_TABS_MESSAGE,
        contexts: defaultContexts,
        checked: false,
        parentId: MENU_ID_AUTO_SAVE,
      });
      menusCheckedState.set(MENU_ID_AUTO_SAVE_UNPINNED, false);
      menus.create({
        id: MENU_ID_AUTO_SAVE_ALL,
        type: 'radio',
        title: MENU_AUTOSAVE_ALL_TABS_MESSAGE,
        contexts: defaultContexts,
        checked: false,
        parentId: MENU_ID_AUTO_SAVE,
      });
      menusCheckedState.set(MENU_ID_AUTO_SAVE_ALL, false);
    }
    menusCreated = true;
    if (pendingRefresh) {
      pendingRefresh = false;
      (await singlefile.extension.core.bg.tabs.get({})).forEach(async tab => await refreshTab(tab));
    }
  }

  async function initialize() {
    const business = singlefile.extension.core.bg.business;
    const tabs = singlefile.extension.core.bg.tabs;
    const tabsData = singlefile.extension.core.bg.tabsData;
    const config = singlefile.extension.core.bg.config;
    if (BROWSER_MENUS_API_SUPPORTED) {
      createMenus();
      menus.onClicked.addListener(async (event, tab) => {
        if (event.menuItemId == MENU_ID_SAVE_PAGE) {
          business.saveTab(tab);
        }
        if (event.menuItemId == MENU_ID_SAVE_SELECTED) {
          business.saveTab(tab, { selected: true });
        }
        if (event.menuItemId == MENU_ID_SAVE_FRAME) {
          business.saveTab(tab, { frameId: event.frameId });
        }
        if (event.menuItemId == MENU_ID_SAVE_SELECTED_TABS || event.menuItemId == MENU_ID_BUTTON_SAVE_SELECTED_TABS) {
          const allTabs = await tabs.get({ currentWindow: true, highlighted: true });
          allTabs.forEach(tab => business.saveTab(tab));
        }
        if (event.menuItemId == MENU_ID_SAVE_UNPINNED_TABS || event.menuItemId == MENU_ID_BUTTON_SAVE_UNPINNED_TABS) {
          const allTabs = await tabs.get({ currentWindow: true, pinned: false });
          allTabs.forEach(tab => business.saveTab(tab));
        }
        if (event.menuItemId == MENU_ID_SAVE_ALL_TABS || event.menuItemId == MENU_ID_BUTTON_SAVE_ALL_TABS) {
          const allTabs = await tabs.get({ currentWindow: true });
          allTabs.forEach(tab => business.saveTab(tab));
        }
        if (event.menuItemId == MENU_ID_AUTO_SAVE_TAB) {
          const allTabsData = await tabsData.get(tab.id);
          allTabsData[tab.id].autoSave = true;
          await tabsData.set(allTabsData);
          refreshExternalComponents(tab);
        }
        if (event.menuItemId == MENU_ID_AUTO_SAVE_DISABLED) {
          const allTabsData = await tabsData.get();
          Object.keys(allTabsData).forEach(tabId => (allTabsData[tabId].autoSave = false));
          allTabsData.autoSaveUnpinned = allTabsData.autoSaveAll = false;
          await tabsData.set(allTabsData);
          refreshExternalComponents(tab);
        }
        if (event.menuItemId == MENU_ID_AUTO_SAVE_ALL) {
          const allTabsData = await tabsData.get();
          allTabsData.autoSaveAll = event.checked;
          await tabsData.set(allTabsData);
          refreshExternalComponents(tab);
        }
        if (event.menuItemId == MENU_ID_AUTO_SAVE_UNPINNED) {
          const allTabsData = await tabsData.get();
          allTabsData.autoSaveUnpinned = event.checked;
          await tabsData.set(allTabsData);
          refreshExternalComponents(tab);
        }
        if (event.menuItemId.startsWith(MENU_ID_SELECT_PROFILE_PREFIX)) {
          const [profiles, allTabsData] = await Promise.all([config.getProfiles(), tabsData.get()]);
          const profileId = event.menuItemId.split(MENU_ID_SELECT_PROFILE_PREFIX)[1];
          if (profileId == 'default') {
            allTabsData.profileName = config.DEFAULT_PROFILE_NAME;
          } else {
            const profileIndex = Number(profileId);
            allTabsData.profileName = Object.keys(profiles)[profileIndex];
          }
          await tabsData.set(allTabsData);
          refreshExternalComponents(tab);
        }
        if (event.menuItemId.startsWith(MENU_ID_ASSOCIATE_WITH_PROFILE_PREFIX)) {
          const [profiles, rule] = await Promise.all([config.getProfiles(), config.getRule(tab.url)]);
          const profileId = event.menuItemId.split(MENU_ID_ASSOCIATE_WITH_PROFILE_PREFIX)[1];
          let profileName;
          if (profileId == 'default') {
            profileName = config.DEFAULT_PROFILE_NAME;
          } else if (profileId == 'current') {
            profileName = config.CURRENT_PROFILE_NAME;
          } else {
            const profileIndex = Number(profileId);
            profileName = Object.keys(profiles)[profileIndex];
          }
          if (rule) {
            await config.updateRule(rule.url, rule.url, profileName, profileName);
          } else {
            await updateTitleValue(MENU_ID_ASSOCIATE_WITH_PROFILE, MENU_UPDATE_RULE_MESSAGE);
            await config.addRule(new URL(tab.url).hostname, profileName, profileName);
          }
        }
      });
      if (menusCreated) {
        pendingRefresh = true;
      } else {
        (await tabs.get({})).forEach(async tab => await refreshTab(tab));
      }
    }
  }

  async function refreshExternalComponents(tab) {
    const tabsData = await singlefile.extension.core.bg.tabsData.get(tab.id);
    await singlefile.extension.core.bg.autosave.refreshTabs();
    await singlefile.extension.ui.bg.button.refreshTab(tab);
    try {
      await browser.runtime.sendMessage({ method: 'options.refresh', profileName: tabsData.profileName });
    } catch (error) {
      // ignored
    }
  }

  async function refreshTab(tab) {
    const config = singlefile.extension.core.bg.config;
    if (BROWSER_MENUS_API_SUPPORTED && menusCreated) {
      const tabsData = await singlefile.extension.core.bg.tabsData.get(tab.id);
      const promises = [];
      promises.push(updateCheckedValue(MENU_ID_AUTO_SAVE_DISABLED, !tabsData[tab.id].autoSave));
      promises.push(updateCheckedValue(MENU_ID_AUTO_SAVE_TAB, tabsData[tab.id].autoSave));
      promises.push(updateCheckedValue(MENU_ID_AUTO_SAVE_UNPINNED, Boolean(tabsData.autoSaveUnpinned)));
      promises.push(updateCheckedValue(MENU_ID_AUTO_SAVE_ALL, Boolean(tabsData.autoSaveAll)));
      if (tab && tab.url) {
        const options = await config.getOptions(tab.url);
        promises.push(updateVisibleValue(tab, options.contextMenuEnabled));
        promises.push(menus.update(MENU_ID_SAVE_SELECTED, { visible: !options.saveRawPage }));
        let selectedEntryId = MENU_ID_ASSOCIATE_WITH_PROFILE_PREFIX + 'default';
        let title = MENU_CREATE_DOMAIN_RULE_MESSAGE;
        const [profiles, rule] = await Promise.all([config.getProfiles(), config.getRule(tab.url)]);
        if (rule) {
          const profileIndex = profileIndexes.get(rule.profile);
          if (profileIndex) {
            selectedEntryId = MENU_ID_ASSOCIATE_WITH_PROFILE_PREFIX + profileIndex;
            title = MENU_UPDATE_RULE_MESSAGE;
          }
        }
        if (Object.keys(profiles).length > 1) {
          Object.keys(profiles).forEach((profileName, profileIndex) => {
            if (profileName == config.DEFAULT_PROFILE_NAME) {
              promises.push(updateCheckedValue(MENU_ID_ASSOCIATE_WITH_PROFILE_PREFIX + 'default', selectedEntryId == MENU_ID_ASSOCIATE_WITH_PROFILE_PREFIX + 'default'));
            } else {
              promises.push(updateCheckedValue(MENU_ID_ASSOCIATE_WITH_PROFILE_PREFIX + profileIndex, selectedEntryId == MENU_ID_ASSOCIATE_WITH_PROFILE_PREFIX + profileIndex));
            }
          });
          promises.push(updateTitleValue(MENU_ID_ASSOCIATE_WITH_PROFILE, title));
        }
      }
      await Promise.all(promises).catch(() => console.error('refresh failed'));
    }
  }

  async function updateVisibleValue(tab, visible) {
    const lastVisibleValue = menusVisibleState;
    menusVisibleState = visible;
    if (lastVisibleValue === undefined || lastVisibleValue != visible) {
      await createMenus(tab);
    }
  }

  function updateTitleValue(id, title) {
    const lastTitleValue = menusTitleState.get(id);
    menusTitleState.set(id, title);
    if (lastTitleValue === undefined) {
      return menus.update(id, { title });
    } else if (lastTitleValue != title) {
      return menus.update(id, { title });
    }
  }

  async function updateCheckedValue(id, checked) {
    checked = Boolean(checked);
    const lastCheckedValue = menusCheckedState.get(id);
    menusCheckedState.set(id, checked);
    if (lastCheckedValue === undefined || lastCheckedValue != checked) {
      await menus.update(id, { checked });
    }
  }
})();
