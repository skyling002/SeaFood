import { fetchUserCenter} from '../../services/usercenter/fetchUsercenter';
import { registerUser } from '../../services/usercenter/registerUser';
import { getToPayOrderCount, getToSendOrderCount, getToReceiveOrderCount, getToCommentOrderCount, getAfterSaleOrderCount } from '../../services/order/order';
import { ORDER_STATUS } from '../../services/order/order';
import Toast from 'tdesign-miniprogram/toast/index';

const menuData = [
  [
    {
      title: '收货地址',
      tit: '',
      url: '',
      type: 'address',
    },
    {
      title: '积分中心',
      url: '',
      type: 'point',
    },
    {
      title: '联系客服',
      url: '',
      type: 'service',
    },
    {
      title: '帮助中心',
      url: '',
      type: 'help-center',
    },

  ],
];

const orderTagInfos = [
  {
    title: '待付款',
    iconName: 'wallet',
    orderNum: 0,
    tabType: ORDER_STATUS.TO_PAY,
    status: 1,
  },
  {
    title: '待发货',
    iconName: 'deliver',
    orderNum: 0,
    tabType: ORDER_STATUS.TO_SEND,
    status: 1,
  },
  {
    title: '待收货',
    iconName: 'package',
    orderNum: 0,
    tabType: ORDER_STATUS.TO_RECEIVE,
    status: 1,
  },
  {
    title: '待评价',
    iconName: 'comment',
    orderNum: 0,
    tabType: ORDER_STATUS.FINISHED,
    status: 1,
  },
  {
    title: '退款/售后',
    iconName: 'exchang',
    orderNum: 0,
    tabType: 0,
    status: 1,
  },
];

const defaultAvatar = 'https://636c-cloud1-5g3rtj7qe52f5db7-1389215505.tcb.qcloud.la/%E5%BE%AE%E4%BF%A1%E5%A4%B4%E5%83%8F.webp?sign=3489081daaf1e2930c7a449fd60473ab&t=1764661830';

const getDefaultData = () => ({
  showMakePhone: false,
  userInfo: {
    avatarUrl: defaultAvatar,
    nickName: '请登录',
    phoneNumber: '',
  },
  menuData,
  orderTagInfos,
  customerServiceInfo: {},
  currAuthStep: 1,
  showKefu: true,
  versionNo: '',
  toPayOrderCount: 0,
  toSendOrderCount: 0,
  toReceiveOrderCount: 0,
});

Page({
  data: getDefaultData(),

  onLoad() {
    this.getVersionInfo();
    this.init();
  },

  onShow() {
    this.getTabBar().init();
    this.syncLocalStorageToPage();
    // Check persistence but prefer re-fetching to keep sync
    // this.fetUseriInfoHandle(); 
    // this.initOrderCount();
  },
  
  onPullDownRefresh() {
    this.refreshUserInfo(true);
  },

  init() {
    // this.fetUseriInfoHandle();
    // this.initOrderCount();
    // 第一步：先同步本地缓存到页面（快速显示状态）
    this.syncLocalStorageToPage();
    // 第二步：如果本地有登录状态，自动拉取最新订单数（无需用户操作）
    if (this.data.currAuthStep === 2) {
      this.initOrderCount();
    }
  },

    /** 核心方法：同步本地缓存到页面数据（快速显示登录状态） */
  syncLocalStorageToPage() {
    try {
      const isLoggedIn = wx.getStorageSync('isLoggedIn');
      const localUserInfo = wx.getStorageSync('userInfo');
      
      if (isLoggedIn && localUserInfo) {
        // 本地有缓存：显示登录状态
        this.setData({
          userInfo: { ...localUserInfo, avatarUrl: localUserInfo.avatarUrl || defaultAvatar },
          currAuthStep: 2, // 标记已登录
        });
      } else {
        // 本地无缓存：显示“请登录”
        this.setData({
          userInfo: {
            avatarUrl: defaultAvatar,
            nickName: '请登录',
            phoneNumber: '',
          },
          currAuthStep: 1, // 标记未登录
        });
      }
    } catch (e) {
      console.error('读取本地缓存失败', e);
      // 缓存读取失败时，显示未登录状态
      this.setData({ currAuthStep: 1 });
    }
  },

    /** 刷新用户信息（调用接口校验，可选强制更新） */
  async refreshUserInfo(force = false) {
    // 只有“已登录”或“强制刷新”时，才调用接口
    if (this.data.currAuthStep !== 2 && !force) return;
    
    try {
      const { userInfo, countsData, customerServiceInfo, isMember } = await fetchUserCenter();
      
      if (isMember && userInfo) {
        // 接口返回已登录：更新本地缓存和页面
        wx.setStorageSync('userInfo', userInfo);
        wx.setStorageSync('isLoggedIn', true);
        // 更新菜单数字标记
        menuData?.[0].forEach((v) => {
          countsData.forEach((counts) => {
            if (counts.type === v.type) v.tit = counts.num;
          });
        });
        this.setData({
          userInfo: { ...userInfo, avatarUrl: userInfo.avatarUrl || defaultAvatar },
          menuData,
          customerServiceInfo,
          currAuthStep: 2,
        });
        this.initOrderCount(); // 同步更新订单数
      } else {
        // 接口返回未登录：清除本地缓存，显示“请登录”
        wx.removeStorageSync('userInfo');
        wx.removeStorageSync('isLoggedIn');
        this.setData({
          userInfo: { avatarUrl: defaultAvatar, nickName: '请登录', phoneNumber: '' },
          currAuthStep: 1,
        });
      }
    } catch (err) {
      console.error('刷新用户信息失败', err);
      Toast({ context: this, selector: '#t-toast', message: '状态同步失败' });
    } finally {
      wx.stopPullDownRefresh();
    }
  },

  async initOrderCount() {
    try {
      const [pay, send, receive, comment, afterSale] = await Promise.all([
        getToPayOrderCount(),
        getToSendOrderCount(),
        getToReceiveOrderCount(),
        getToCommentOrderCount(),
        getAfterSaleOrderCount(),
      ]);
      this.setData({
        'orderTagInfos[0].orderNum': pay,
        'orderTagInfos[1].orderNum': send,
        'orderTagInfos[2].orderNum': receive,
        'orderTagInfos[3].orderNum': comment,
        'orderTagInfos[4].orderNum': afterSale,
      });
    } catch (e) {
      console.error('initOrderCount error', e);
    }
  },

  onClickCell({ currentTarget }) {
    const { type } = currentTarget.dataset;
    
    if (['service', 'help-center'].includes(type)) {
         // Allowed
    } else {
        if (!this.checkLogin()) return;
    }

    switch (type) {
      case 'address': {
        wx.navigateTo({ url: '/pages/usercenter/address/list/index' });
        break;
      }
      case 'service': {
        this.openMakePhone();
        break;
      }
      case 'help-center': {
        Toast({
          context: this,
          selector: '#t-toast',
          message: '敬请期待...',
          icon: '',
          duration: 1000,
        });
        break;
      }
      case 'point': {
        Toast({
          context: this,
          selector: '#t-toast',
          message: '敬请期待...',
          icon: '',
          duration: 1000,
        });
        break;
      }
      default: {
        Toast({
          context: this,
          selector: '#t-toast',
          message: '未知跳转',
          icon: '',
          duration: 1000,
        });
        break;
      }
    }
  },

  jumpNav(e) {
    if (!this.checkLogin()) return;
    
    const status = e.detail.tabType;

    if (status === 0) {
      wx.navigateTo({ url: '/pages/order/after-service-list/index' });
    } else {
      wx.navigateTo({ url: `/pages/order/order-list/index?status=${status}` });
    }
  },

  jumpAllOrder() {
    if (!this.checkLogin()) return;
    wx.navigateTo({ url: '/pages/order/order-list/index' });
  },

  openMakePhone() {
    this.setData({ showMakePhone: true });
  },

  closeMakePhone() {
    this.setData({ showMakePhone: false });
  },

  call() {
    wx.makePhoneCall({
      phoneNumber: this.data.customerServiceInfo.servicePhone,
    });
  },

  gotoUserEditPage() {
    const { currAuthStep } = this.data;
    if (currAuthStep === 2) {
      wx.navigateTo({ url: '/pages/usercenter/person-info/index' });
    } else {
      this.handleLogin();
    }
  },
  
  checkLogin() {
      // Check current state or storage
      if (this.data.currAuthStep !== 2) {
          Toast({
              context: this,
              selector: '#t-toast',
              message: '请先登录',
              icon: '',
              duration: 1000,
          });
          return false;
      }
      return true;
  },

  async handleLogin() {
      wx.showLoading({ title: '请稍后...' });
      try {
          const { userInfo, isMember } = await fetchUserCenter();
          wx.hideLoading();

          if (isMember) {
              console.log('用户已注册');
              wx.showLoading({ title: '登录中...' });
              this.setData({
                  userInfo,
                  currAuthStep: 2
              });
              wx.setStorageSync('userInfo', userInfo);
              wx.setStorageSync('isLoggedIn', true);
              this.initOrderCount(); // 登录后立即更新订单数量
              wx.hideLoading();
              Toast({ context: this, selector: '#t-toast', message: '登录成功' });
          } else {
              console.log('用户未注册，准备弹出协议');
              // 延迟调用，确保 loading 已完全消失
              setTimeout(() => {
                  this.showAgreementDialog();
              }, 200);
          }
      } catch (err) {
          wx.hideLoading();
          Toast({ context: this, selector: '#t-toast', message: '登录失败，请重试' });
          console.error(err);
      }
  },

  showAgreementDialog() {
    console.log('showAgreementDialog start');
      wx.showModal({
          title: '用户协议',
          content: '欢迎使用TCB Shop，请同意我们的用户协议以继续使用。',
          confirmText: '同意',
          cancelText: '拒绝',
          success: async (res) => {
              console.log('wx.showModal success', res);
              if (res.confirm) {
                  console.log('用户同意注册');
                  this.doRegister();
              } else {
                  console.log('用户拒绝');
              }
          },
          fail: (err) => {
              console.error('wx.showModal fail', err);
              Toast({ context: this, selector: '#t-toast', message: '弹窗失败: ' + err.errMsg });
          }
      });
  },

  async doRegister() {
      console.log('doRegister');
      wx.showLoading({ title: '注册中...' });
      try {
          const defaultUserInfo = {
            nickName: '微信用户',
            avatarUrl: '',
            phoneNumber: '',
          };
          console.log('doRegister defaultUserInfo', defaultUserInfo);
          await registerUser(defaultUserInfo);
          console.log('registerUser success');
          // Re-fetch to ensure state consistency
          const { userInfo } = await fetchUserCenter();
          console.log('doRegister success', userInfo);
          this.setData({
              userInfo,
              currAuthStep: 2
          });
          wx.setStorageSync('userInfo', userInfo);
          wx.setStorageSync('isLoggedIn', true);
          this.initOrderCount(); // 注册成功后立即更新订单数量
          
          wx.hideLoading();
          Toast({ context: this, selector: '#t-toast', message: '注册并登录成功' });
      } catch (err) {
          wx.hideLoading();
          Toast({ context: this, selector: '#t-toast', message: '注册失败' });
          console.error(err);
      }
  },

  getVersionInfo() {
    const versionInfo = wx.getAccountInfoSync();
    const { version, envVersion = __wxConfig } = versionInfo.miniProgram;
    this.setData({
      versionNo: envVersion === 'release' ? version : envVersion,
    });
  },
});
