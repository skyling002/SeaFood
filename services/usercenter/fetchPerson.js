import { config } from '../../config/index';
import { DATA_MODEL_KEY, DELIVERY_INFO } from '../../config/model';
import { model } from '../_utils/model';

/** 获取个人中心信息 */
function mockFetchPerson() {
  const { delay } = require('../_utils/delay');
  const { genSimpleUserInfo } = require('../../model/usercenter');
  const { genAddress } = require('../../model/address');
  const address = genAddress();
  return delay().then(() => ({
    ...genSimpleUserInfo(),
    address: {
      provinceName: address.provinceName,
      provinceCode: address.provinceCode,
      cityName: address.cityName,
      cityCode: address.cityCode,
    },
  }));
}

// TODO: 从数据库中获取用户地址信息
async function getAddress(){
  
}


async function getPersonInfo() {
  try {
    // 优先读取本地缓存，提升加载速度
    const cachedInfo = wx.getStorageSync('personInfo');
    if (cachedInfo) {
      console.log('从缓存中获取个人信息', cachedInfo);
      return cachedInfo;
    }

    const { data } = await model()[DATA_MODEL_KEY.USER].list({
      pageNumber: 1,
      pageSize: 1,
    });
    // 防止 data.records 不存在导致的报错
    const info = data?.records?.[0] || null;
    
    // 存入缓存
    if (info) {
      wx.setStorageSync('personInfo', info);
    }
    
    return info;
  } catch (error) {
    console.error('获取个人信息失败：', error);
    throw error; // 抛出错误，让调用方 catch 处理
  }
}

function transformPersonInfo(personInfo) {
  if (!personInfo) {
    return null;
  }
  const { address = {} } = personInfo;
  return {
    ...personInfo,
    address: {
      provinceName: address.provinceName,
      provinceCode: address.provinceCode,
      cityName: address.cityName,
      cityCode: address.cityCode,
    },
  };
}


/** 获取个人中心信息 */
export async function fetchPerson() {
  if (config.useMock) {
    return mockFetchPerson();
  }
  // 1. 等待真实接口返回数据（await 解析 Promise）
  const personInfo = await getPersonInfo();
  // 2. 数据转换后返回（此时 personInfo 是真实数据，而非 Promise）
  return transformPersonInfo(personInfo);
}
