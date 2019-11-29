/*
 * Copyright ©️ 2018 Galt•Project Society Construction and Terraforming Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka)
 *
 * Copyright ©️ 2018 Galt•Core Blockchain Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka) by
 *  [Basic Agreement](ipfs/QmaCiXUmSrP16Gz8Jdzq6AJESY1EAANmmwha15uR3c1bsS)).
 */

export enum Settings {
  StorageNodeType = 'storage-node-type',
  StorageNodeAddress = 'storage-node-address',
  StorageNodeKey = 'storage-node-key',
  StorageExtensionIpld = 'storage-extension-ipld',
  StorageExtensionIpldUpdatedAt = 'storage-extension-ipld-updated-at',
  StorageExtensionIpnsUpdatedAt = 'storage-extension-ipns-updated-at',
  StorageExtensionIpldError = 'storage-extension-ipld-error',
}

export function getSettingData(name) {
  if (name === Settings.StorageNodeType) {
    return {
      type: 'list',
      list: [
        {
          title: 'IPFS',
          value: 'ipfs',
        },
        {
          title: 'GeeSome',
          value: 'geesome',
        },
      ],
    };
  }
  if (name === Settings.StorageExtensionIpldUpdatedAt || name === Settings.StorageExtensionIpnsUpdatedAt) {
    return {
      type: 'date',
    };
  }
  if (name === Settings.StorageExtensionIpld) {
    return {
      type: 'hash',
    };
  }

  return {
    type: 'string',
  };
}
