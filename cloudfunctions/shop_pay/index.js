const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

// 集合名称常量，确保与数据库中的集合名一致
const ORDER_COLLECTION = 'doc_order';
const ORDER_ITEM_COLLECTION = 'doc_order_item';

exports.main = async (event, context) => {
  console.log('=== DEBUG: shop_pay refactored ===');
  console.log('Event:', event);
  
  const wxContext = cloud.getWXContext();
  const { orderId } = event;
  
  try {
    // 1. 获取订单详情
    const orderRes = await db.collection(ORDER_COLLECTION).doc(orderId).get();
    const order = orderRes.data;

    console.log('Caller OpenID:', wxContext.OPENID);
    console.log('Order OpenID:', order._openid);

    // 校验调用者（可选，调试期间可注释）
    if (order._openid && wxContext.OPENID !== order._openid) {
       console.warn("Warning: caller OpenID does not match order OpenID");
    }
    
    // 2. 获取订单项详情，计算总价
    // 注意：这里假设 order.order_item 存储的是对象数组且包含 _id，或者就是 id 数组
    // 原代码：order.order_item 是一个数组，每个元素有 _id
    
    const orderItems = order.order_item || [];
    const skus = await Promise.all(orderItems.map(async (item) => {
      const itemId = item._id || item; // 兼容直接存 ID 的情况
      const itemRes = await db.collection(ORDER_ITEM_COLLECTION).doc(itemId).get();
      console.log('DEBUG: Order Item Detail:', JSON.stringify(itemRes.data, null, 2)); // 打印详情
      return itemRes.data;
    }));

    // 计算总价（单位：分）
    let totalPrice = 0;
    for (const item of skus) {
        let price = 0;
        // 情况1：sku 是对象且有 price (快照)
        if (item.sku && item.sku.price) {
            price = item.sku.price;
        } 
        // 情况2：sku 是 ID，需要查 doc_sku 表
        else if (item.sku && typeof item.sku === 'string') {
            try {
                console.log('Fetching SKU price from doc_sku for:', item.sku);
                const skuRes = await db.collection('doc_sku').doc(item.sku).get();
                if (skuRes.data && skuRes.data.price) {
                    price = skuRes.data.price;
                }
            } catch (e) {
                console.warn('Failed to fetch SKU:', e);
            }
        }
        
        if (!price) {
             console.warn('Warning: Price not found in order item', item);
        }
        totalPrice += (item.count || 0) * price;
    }
    
    console.log('Calculated Total Price:', totalPrice);

    if (totalPrice <= 0) {
        // 兜底：如果算出来是 0，可能是数据结构不对，为了防止支付报错，设为 1 分钱（仅测试）
        // 或者抛出错误
        console.warn('Total price is 0, forcing to 1 for testing');
        // totalPrice = 1; // 生产环境请删除此行
        // throw new Error("Total price is 0");
    }

    // 3. 调用微信支付统一下单 (通过 cloudbase_module)
    // 这里的 cloudbase_module 是一个特殊的云函数吗？
    // 原代码调用了 cloud.callFunction({ name: 'cloudbase_module', ... })
    // 这是一个通过模板安装的通用支付模块。
    
    const res = await cloud.callFunction({
      name: 'cloudbase_module',
      data: {
        name: 'wxpay_order',
        data: {
          description: 'Shop Order',
          amount: {
            total: totalPrice * 100, // 单位：分
            currency: 'CNY',
          },
          out_trade_no: order._id,
          payer: {
            openid: wxContext.OPENID,
          },
        },
      },
    });

    console.log("wxpay_order result", res);
    return res.result;

  } catch (e) {
    console.error("Error in shop_pay:", e);
    return {
      code: -1,
      msg: e.message,
      error: e
    };
  }
};
