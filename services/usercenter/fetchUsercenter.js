import { config } from '../../config/index';

import { getUserInfo } from './getUserInfo';


/** 获取个人中心信息 */
function mockFetchUserCenter() {
  const { delay } = require('../_utils/delay');
  const { genUsercenter } = require('../../model/usercenter');
  return delay(200).then(() => genUsercenter());
}

/** 获取个人中心信息 */
export async function fetchUserCenter() {
  if (config.useMock) {
    return mockFetchUserCenter();
  }

  return getUserInfo();
}


