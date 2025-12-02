import { fetchPerson } from '../../../services/usercenter/fetchPerson';
import { phoneEncryption } from '../../../utils/util';

Page({
  data: {
    personInfo: {
      avatarUrl: '',
      nickName: '',
      phoneNumber: '',
    },
    isEditingPhone: false, // 新增：控制是否显示手机号输入框
    phoneError: '', // 新增：手机号验证错误提示
  },
  
  // 保存原始手机号，用于编辑时使用
  originalPhoneNumber: '',
  // 保存原始昵称，用于编辑时使用
  originalNickName: '',
  
  onLoad() {
    this.init();
  },
  
  init() {
    this.fetchData();
  },
  
  fetchData() {
    fetchPerson().then((personInfo) => {
      // 保存原始手机号
      this.originalPhoneNumber = personInfo.phoneNumber;
      // 保存原始昵称
      this.originalNickName = personInfo.nickName;
      // 显示时使用加密后的手机号
      this.setData({
        personInfo: {
          ...personInfo,
          phoneNumber: phoneEncryption(personInfo.phoneNumber),
        },
      });
    });
  },

  updateAvatar(avatarUrl) {
    // TODO 模拟异步上传头像到服务器
    // return new Promise((resolve, reject) => {
    //   if (!avatarUrl) {
    //     reject('头像地址为空');
    //     return;
    //   }
    //   wx.uploadFile({
    //     url: '你的头像上传接口',
    //     filePath: avatarUrl,
    //     name: 'file',
    //     header: {
    //       'content-type': 'multipart/form-data' // 上传文件必填
    //     },
    //     success: (res) => {
    //       const resData = JSON.parse(res.data);
    //       if (resData.code === 200) {
    //         resolve(resData.data.avatarUrl); // 服务器返回的正式地址
    //       } else {
    //         wx.showToast({ title: resData.msg || '头像上传失败', icon: 'none' });
    //         reject(resData.msg);
    //       }
    //     },
    //     fail: (err) => {
    //       wx.showToast({ title: '网络错误，上传失败', icon: 'none' });
    //       reject(err);
    //     }
    //   });
    // });
  },

  updateUserInfo(){
    // TODO 更新用户信息
    // const { personInfo } = this.data;
    // // 这里可以添加最终的全量验证（可选）
    // if (!personInfo.nickName) {
    //   wx.showToast({ title: '昵称不能为空', icon: 'none' });
    //   return;
    // }
    // 调用接口提交数据（示例）
    // wx.request({
    //   url: '你的用户信息更新接口',
    //   method: 'POST',
    //   data: {
    //     avatarUrl: personInfo.avatarUrl,
    //     nickName: personInfo.nickName,
    //     phoneNumber: this.originalPhoneNumber // 提交原始手机号（未加密）
    //   },
    //   success: (res) => {
    //     if (res.data.code === 200) {
    //       wx.showToast({ title: '信息更新成功' });
    //     } else {
    //       wx.showToast({ title: res.data.msg || '更新失败', icon: 'none' });
    //     }
    //   },
    //   fail: () => {
    //     wx.showToast({ title: '网络错误，更新失败', icon: 'none' });
    //   }
    // });
  },
  
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail;
    this.setData({ 'personInfo.avatarUrl': avatarUrl }); // 先更新本地显示
  
    // TODO 等待完善 上传成功后，再调用 updateUserInfo() 提交完整信息
    // this.updateAvatar(avatarUrl).then((serverAvatarUrl) => {
    //   // 更新为服务器返回的正式地址（避免用临时地址）
    //   this.setData({ 'personInfo.avatarUrl': serverAvatarUrl });
    //   this.updateUserInfo(); // 上传完成后再提交
    // });
  },

  bindKeyInput(e) {
    this.setData({ 'personInfo.nickName': e.detail.value });
  },

  onNameBlur() {
    const { nickName } = this.data.personInfo;
    // 假设原始昵称保存在 onLoad 时（需新增一个 originalNickName 变量）
    if (nickName !== this.originalNickName) {
      this.updateUserInfo();
      this.originalNickName = nickName; // 更新原始值
    }
  },
  
  
  // 新增：手机号格式验证函数
  validatePhone(phone) {
    // 中国大陆手机号正则表达式
    const phoneReg = /^1[3-9]\d{9}$/;
    if (!phone) {
      return '请输入手机号';
    } else if (!phoneReg.test(phone)) {
      return '请输入正确的手机号格式';
    }
    return '';
  },
  
  // 修正函数名拼写错误
  bindPhoneNumber(e){
    const phone = e.detail.value;
    // 实时验证手机号格式
    const error = this.validatePhone(phone);
    this.setData({
      'personInfo.phoneNumber': phone,
      phoneError: error
    });
  },
  
  // 新增：点击手机号区域事件处理
  onClickCell(e) {
    const { type } = e.currentTarget.dataset;
    if (type === 'phoneNumber') {
      // 点击手机号区域，显示输入框，并显示完整的手机号
      this.setData({
        isEditingPhone: true,
        // 编辑时显示完整的手机号，而不是加密后的手机号
        'personInfo.phoneNumber': this.originalPhoneNumber || '',
      });
    }
  },
  
  // 新增：手机号输入完成事件处理
  onPhoneBlur(e) {
    const phone = e.detail.value.trim();
    const error = this.validatePhone(phone);
    this.setData({ phoneError: error });
    
    // 优化：仅当 验证通过 + 手机号有变更 时，才更新并提交
    if (!error) {
      // 判断手机号是否真的修改了（避免重复提交）
      if (phone !== this.originalPhoneNumber) {
        this.originalPhoneNumber = phone; // 更新原始手机号
        this.setData({
          isEditingPhone: false,
          'personInfo.phoneNumber': phoneEncryption(phone),
        });
        this.updateUserInfo(); // 仅此时调用（数据有效且已变更）
      } else {
        // 未修改手机号，仅隐藏输入框，不提交
        this.setData({ isEditingPhone: false });
      }
    }
    // 验证失败时，不调用 updateUserInfo()（避免提交异常数据）
  },  
});
