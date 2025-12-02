import { model } from '../_utils/model';
import { DATA_MODEL_KEY } from '../../config/model';

// 微信默认头像（避免头像字段为空）
const defaultAvatarUrl = 'https://636c-cloud1-5g3rtj7qe52f5db7-1389215505.tcb.qcloud.la/%E5%BE%AE%E4%BF%A1%E7%99%BB%E5%BD%95%E9%BB%98%E8%AE%A4%E5%A4%B4%E5%83%8F.png?sign=5501830b9edfec1267f7dd0a3f6d6dbd&t=1764667902';

/**
 * 注册用户（适配微信云开发文档型数据库）
 * @param {Object} userInfo - 用户信息（可选，自动兜底默认值）
 * @param {string} userInfo.avatarUrl - 头像地址
 * @param {string} userInfo.nickName - 昵称
 * @param {string} [userInfo.phoneNumber] - 手机号（可选）
 * @returns {Promise} - 注册结果（包含文档 _id）
 */
export async function registerUser(userInfo = {}) {
  try {
    // 1. 数据兜底：确保核心字段非空（文档型数据库允许缺省字段，但核心字段建议兜底）
    const userDoc = {
      // 基础信息（缺省则用默认值，避免空字段）
      avatarUrl: userInfo.avatarUrl || defaultAvatarUrl,
      nickName: userInfo.nickName || '微信用户',
      phoneNumber: userInfo.phoneNumber || '', // 可选字段，空字符串兜底
      
      // 业务字段（固定添加，文档型数据库可直接扩展）
      points: 0, // 初始积分
      
      // 时间戳（文档型数据库常用，便于排序/筛选）
      //createdAt: Date.now(), // 创建时间（毫秒级）
      //updatedAt: Date.now(), // 更新时间（毫秒级）
      
      // 扩展字段（后续需添加的字段可直接在这里加，无需修改表结构）
      // 例：tags: [], // 标签数组
      // 例：preferences: { receiveNotice: true } // 偏好设置对象
    };

    // 2. 调用文档型数据库的 create 接口（关键：按云开发原生格式传 data）
    const userModel = model()[DATA_MODEL_KEY.USER];
    const result = await userModel.create({
      data: userDoc // 文档型数据库要求：必须用 data 字段包裹文档对象
    });
    console.log('文档型数据库注册成功', result);
    // 3. 返回结果（包含自动生成的文档 _id，便于后续关联）
    return {
      success: true,
      docId: result._id, // 文档唯一ID（云数据库自动生成）
      userDoc: userDoc
    };
  } catch (error) {
    console.error('文档型数据库注册失败', error);
    throw error; // 抛出错误，让调用方处理
  }
}
