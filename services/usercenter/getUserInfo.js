import { model } from '../_utils/model';
import { DATA_MODEL_KEY } from '../../config/model';



const defaultAvatar = 'https://636c-cloud1-5g3rtj7qe52f5db7-1389215505.tcb.qcloud.la/%E5%BE%AE%E4%BF%A1%E5%A4%B4%E5%83%8F.webp?sign=3489081daaf1e2930c7a449fd60473ab&t=1764661830';


let userInfo = {
    avatarUrl: defaultAvatar,
    nickName: '微信用户',
    phoneNumber: '',
  };
  let countsData = [
    { num: 0, name: '积分', type: 'point' },
  ];
  let isMember = false;

export async function getUserInfo(){
  try {
    // 查询 shop_user 表
    // 这里的 list() 会自动带上 _openid 过滤，仅返回当前用户的数据
    const { data } = await model()[DATA_MODEL_KEY.USER].list({
      pageNumber: 1,
      pageSize: 1,
    });

    if (data?.records?.length > 0) {
      const u = data.records[0];
      
      // 缓存 _openid 用于后续业务查询
      if (u._openid) {
        wx.setStorageSync('_openid', u._openid);
      }

      userInfo = {
        avatarUrl: u.avatarUrl || defaultAvatar,
        nickName: u.nickName || '微信用户',
        phoneNumber: u.phoneNumber || '',
      };
      // 更新积分余额展示
      countsData[0].num = u.points || 0;
      isMember = true;
    }
  } catch (e) {
    console.error('获取用户信息失败', e);
  }

  return {
    userInfo,
    countsData,
    customerServiceInfo: {
      servicePhone: '4006336868',
      serviceTimeDuration: '每周三至周五 9:00-12:00  13:00-15:00',
    },
    isMember,
  };
}