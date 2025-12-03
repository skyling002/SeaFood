// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 数据库集合名称，请确保云控制台数据库中存在此集合
const COLLECTION_NAME = 'doc_sku';

// 云函数入口函数
exports.main = async (event) => {
  console.log('Event:', event);
  try {
    const { skuId, data } = event
    
    // 使用 wx-server-sdk 原生数据库 API 更新
    const res = await db.collection(COLLECTION_NAME).doc(skuId).update({
      data: data
    })

    return {
      code: 0,
      data: res
    }
  } catch (e) {
    console.error("Error in shop_update_sku:", e);
    return {
      code: -1,
      msg: e.message
    }
  }
}
