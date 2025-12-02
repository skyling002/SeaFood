import updateManager from './common/updateManager';
import { init } from '@cloudbase/wx-cloud-client-sdk';

wx.cloud.init({
  env: 'cloud1-5g3rtj7qe52f5db7', // 指定云开发环境 ID
});

const client = init(wx.cloud);
const models = client.models;
globalThis.dataModel = models;
// 接下来就可以调用 models 上的数据模型增删改查等方法了

App({
  onLaunch: function () {
    wx.clearStorageSync() // 或 wx.clearStorage()
    wx.clearStorage()
    console.log('开发环境：已清空Storage')
  },
  onShow: function () {
    updateManager();
  },
});
