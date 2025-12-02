const AuthStepType = {
  ONE: 1,
  TWO: 2,
  THREE: 3,
};

Component({
  options: {
    multipleSlots: true,
  },
  properties: {
    currAuthStep: {
      type: Number,
      value: AuthStepType.ONE,
    },
    userInfo: {
      type: Object,
      value: {},
    },
    isNeedGetUserInfo: {
      type: Boolean,
      value: false,
    },
  },
  data: {
    defaultAvatarUrl: 'https://636c-cloud1-5g3rtj7qe52f5db7-1389215505.tcb.qcloud.la/%E5%BE%AE%E4%BF%A1%E7%99%BB%E5%BD%95%E9%BB%98%E8%AE%A4%E5%A4%B4%E5%83%8F.png?sign=f56eff6c8789d031f1a664057212ce21&t=1764667826',
      // 'https://636c-cloud1-5g3rtj7qe52f5db7-1389215505.tcb.qcloud.la/%E5%BE%AE%E4%BF%A1%E5%A4%B4%E5%83%8F.webp?sign=3489081daaf1e2930c7a449fd60473ab&t=1764661830',
    AuthStepType,
  },
  methods: {
    gotoUserEditPage() {
      this.triggerEvent('gotoUserEditPage');
    },
  },
});
