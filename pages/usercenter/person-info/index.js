import { fetchPerson } from '../../../services/usercenter/fetchPerson';
import { phoneEncryption } from '../../../utils/util';
import { uploadAvatar, updateUserInfo } from '../../../services/usercenter/updataUserInfo';
import Toast from 'tdesign-miniprogram/toast/index';

Page({
  data: {
    personInfo: {
      avatarUrl: '',
      nickName: '',
      phoneNumber: '',
      avatarFileID:'',
    },
    isEditingPhone: false,
    phoneError: '',
  },
  
  // 页面级变量，不参与渲染
  originalPhoneNumber: '',
  originalNickName: '',
  
  onLoad() {
    this.init();
  },
  
  init() {
    this.fetchData();
  },
  
  async fetchData() {
    wx.showLoading({ title: '加载中...' });
    try {
      const personInfo = await fetchPerson();
      if (personInfo) {
        this.originalPhoneNumber = personInfo.phoneNumber;
        this.originalNickName = personInfo.nickName;
        
        this.setData({
          personInfo: {
            ...personInfo,
            // 页面显示加密后的手机号
            phoneNumber: phoneEncryption(personInfo.phoneNumber),
          },
        });
      }
    } catch (err) {
      console.error('获取个人信息失败', err);
      Toast({ context: this, selector: '#t-toast', message: '加载失败，请重试' });
    } finally {
      wx.hideLoading();
    }
  },

  async onChooseAvatar(e) {
    const { avatarUrl } = e.detail;
    console.log('选择的头像地址1:', avatarUrl);
    if (!avatarUrl) return;
    console.log('选择的头像地址2:', avatarUrl);
    // 1. 立即更新本地 UI（提升体验） 
    this.setData({ 'personInfo.avatarUrl': avatarUrl });
    
    // 2. 获取必要的参数
    const userInfo = wx.getStorageSync('userInfo');
    console.log('userInfo:', userInfo); 
    if (!userInfo || !userInfo.openid) {
      console.log('1111');
       Toast({ context: this, selector: '#t-toast', message: '登录状态异常，请重新登录' });
       return;
    } 
    console.log('userInfo.avatarFileID:', userInfo.avatarFileID);
    wx.showLoading({ title: '上传中...' });
    try {
      // 3. 上传头像并更新服务器数据
      // 注意：uploadAvatar 内部已经包含了更新 doc_users 集合的逻辑
      const { fileID, downloadUrl } = await uploadAvatar(
          [avatarUrl], 
          userInfo.openid, 
          userInfo.avatarFileID
      );

      // 4. 再次更新 UI 为远程地址（可选，通常本地路径也能用，但为了持久化最好用远程的）
      this.setData({ 'personInfo.avatarUrl': downloadUrl });
      
      // 5. 更新本地缓存
      const newUserInfo = { ...userInfo, avatarFileID: fileID, avatarUrl: downloadUrl };
      wx.setStorageSync('userInfo', newUserInfo);
      wx.setStorageSync('personInfo', newUserInfo); // 保持 personInfo 缓存也同步

      Toast({ context: this, selector: '#t-toast', message: '头像修改成功' });
    } catch (err) {
      console.error('头像上传失败', err);
      Toast({ context: this, selector: '#t-toast', message: '头像上传失败' });
      // 失败回滚
      this.fetchData();
    } finally {
      wx.hideLoading();
    }
  },

  bindKeyInput(e) {
    this.setData({ 'personInfo.nickName': e.detail.value });
  },

  async onNameBlur() {
    const { nickName } = this.data.personInfo;
    // 对比原始值，仅变更时提交
    if (nickName !== this.originalNickName) {
      const userInfo = wx.getStorageSync('userInfo');
      if (!userInfo) return;

      try {
        await updateUserInfo({
          openid: userInfo.openid,
          nickName,
        });
        this.originalNickName = nickName;
        
        // 同步更新缓存
        const newUserInfo = { ...userInfo, nickName };
        wx.setStorageSync('userInfo', newUserInfo);
        wx.setStorageSync('personInfo', newUserInfo);
        
        Toast({ context: this, selector: '#t-toast', message: '昵称已更新' });
      } catch (err) {
        console.error('昵称更新失败', err);
        Toast({ context: this, selector: '#t-toast', message: '更新失败' });
      }
    }
  },
  
  validatePhone(phone) {
    const phoneReg = /^1[3-9]\d{9}$/;
    if (!phone) return '请输入手机号';
    if (!phoneReg.test(phone)) return '请输入正确的手机号格式';
    return '';
  },
  
  bindPhoneNumber(e){
    const phone = e.detail.value;
    const error = this.validatePhone(phone);
    this.setData({
      'personInfo.phoneNumber': phone,
      phoneError: error
    });
  },
  
  onClickCell(e) {
    const { type } = e.currentTarget.dataset;
    if (type === 'phoneNumber') {
      this.setData({
        isEditingPhone: true,
        // 编辑模式下显示真实手机号
        'personInfo.phoneNumber': this.originalPhoneNumber || '',
        phoneError: '' // 重置错误信息
      });
    }
  },
  
  async onPhoneBlur(e) {
    const phone = e.detail.value.trim();
    const error = this.validatePhone(phone);
    
    this.setData({ phoneError: error });
    
    if (!error) {
      if (phone !== this.originalPhoneNumber) {
        const userInfo = wx.getStorageSync('userInfo');
        try {
            await updateUserInfo({
                openid: userInfo.openid,
                phoneNumber: phone
            });
            
            this.originalPhoneNumber = phone;
            this.setData({
              isEditingPhone: false,
              'personInfo.phoneNumber': phoneEncryption(phone),
            });

            // 同步更新缓存
            const newUserInfo = { ...userInfo, phoneNumber: phone };
            wx.setStorageSync('userInfo', newUserInfo);
            wx.setStorageSync('personInfo', newUserInfo);

            Toast({ context: this, selector: '#t-toast', message: '手机号已更新' });
        } catch (err) {
            console.error('手机号更新失败', err);
            Toast({ context: this, selector: '#t-toast', message: '更新失败' });
        }
      } else {
        // 未变更，直接退出编辑模式
        this.setData({ 
            isEditingPhone: false,
            'personInfo.phoneNumber': phoneEncryption(this.originalPhoneNumber)
        });
      }
    }
  },  
});
