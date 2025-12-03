// 引入项目封装的模型工具、数据模型key、公共查询方法
import { model } from '../_utils/model';
import { DATA_MODEL_KEY } from '../../config/model';
import { getAll } from '../_utils/model';

// 引入微信云开发 SDK（全局已初始化）
const wxCloudClientSdk = wx.cloud;

/**
 * 公共头像上传方法（调用方需提前处理：1.文件路径非空 2.用户已登录（openid存在））
 * @param {string[]} tempFilePaths - 临时文件路径数组（从 chooseavatar 事件获取，调用方确保非空）
 * @param {string} openid - 用户唯一标识（调用方确保已登录并传入）
 * @param {string} [oldAvatarFileID=''] - 旧头像fileID（调用方传入，无则传空字符串）
 * @returns {Promise<{fileID: string, downloadUrl: string}>} - 返回新头像fileID和下载地址
 */
export async function uploadAvatar(tempFilePaths, openid, oldAvatarFileID = '') {
    // 核心逻辑：不做空判断和未登录判断，由调用方保证参数有效性
    const tempFilePath = tempFilePaths[0]; // 取第一个文件（头像默认选1张）

    // 1. 上传新头像到云存储（若失败则直接抛出，无需回滚）
    let uploadResult;
    try {
        uploadResult = await uploadAvatarResult(tempFilePath, openid);
        console.log('新头像上传成功：', uploadResult);
    } catch (err) {
        console.error('公共方法：头像上传到云存储失败：', err);
        throw err;
    }

    const { fileID, downloadUrl } = uploadResult;

    try {
        // TODO 待删除调试
        console.log(`000更新用户openid=${openid}`);
        // 2. 构建新用户头像相关信息（仅包含模型需要的核心字段）
        const avatarInfo = {
            openid,
            avatarFileID: fileID,
            avatarUrl: downloadUrl,
            updateTime: new Date(), // 时间字段（适配模型规范）
        };

        // 3. 调用项目模型，更新到doc_users集合（新增/更新逻辑）
        await updateUserInfo(avatarInfo);

        console.log('用户信息更新成功，开始删除旧头像');

        // 4. 若存在旧头像fileID，调用方法删除（更新成功后再删，避免数据不一致）
        if (oldAvatarFileID) {
            try {
                await deleteOldAvatar(oldAvatarFileID);
                console.log('旧头像删除成功：', oldAvatarFileID);
            } catch (deleteErr) {
                console.error('旧头像删除失败（后续可定时清理）：', deleteErr);
                // 仅打印日志，不抛出错误，避免影响调用方流程
            }
        }
    } catch (err) {
        console.error('公共方法：更新用户信息失败，开始回滚新头像：', err);

        // 失败回滚：删除刚刚上传的新头像
        try {
            await deleteOldAvatar(fileID);
            console.log('新头像回滚删除成功：', fileID);
        } catch (rollbackErr) {
            console.error('新头像回滚删除失败（需后续清理）：', rollbackErr);
        }
        throw err; // 抛出原始错误，由调用方统一处理用户提示
    }

    console.log('头像上传全流程完成');
    return { fileID, downloadUrl }; // 返回结果给调用方，由调用方处理本地缓存更新
}

/**
 * 私有方法：上传头像到云存储，返回fileID和下载地址
 * @param {string} tempFilePath - 临时文件路径（http://tmp/xxx.jpeg）
 * @param {string} openid - 用户唯一标识
 * @returns {Promise<{fileID: string, downloadUrl: string}>}
 */
async function uploadAvatarResult(tempFilePath, openid) {
    const fileExt = tempFilePath.split('.').pop().toLowerCase();
    // 修复：路径添加时间戳，避免同名文件覆盖（原路径会覆盖旧头像文件，导致删除旧文件时出错）
    const cloudPath = `userAvatar/${openid}_${Date.now()}.${fileExt}`;

    // 上传文件到云存储（filePath 支持临时路径，无需 readFileSync，简化代码）
    const uploadRes = await wxCloudClientSdk.uploadFile({
        cloudPath,
        filePath: tempFilePath, // 直接使用临时路径，原生API支持
    });

    const fileID = uploadRes.fileID;
    if (!fileID) throw new Error('云存储上传失败：未获取到fileID');

    // 生成TDesign t-image兼容的临时访问地址
    const urlRes = await wxCloudClientSdk.getTempFileURL({ fileList: [fileID] });
    const downloadUrl = urlRes.fileList[0].tempFileURL;
    if (!downloadUrl) throw new Error('生成访问地址失败');

    return { fileID, downloadUrl };
}

/**
 * 私有方法：删除旧头像（直接调用云存储API）
 * @param {string} fileID - 旧头像fileID
 */
async function deleteOldAvatar(fileID) {
    // 直接调用小程序端云存储API删除文件
    const deleteRes = await wxCloudClientSdk.deleteFile({
        fileList: [fileID],
    });

    // 检查删除结果（status=0 表示成功）
    const result = deleteRes.fileList[0];
    if (result.status !== 0) {
        throw new Error(`云存储删除失败：${result.errMsg}（fileID: ${fileID}）`);
    }
}

/**
 * 公共方法：通过项目模型更新doc_users集合（核心修复select参数格式）
 * @param {Object} userInfo - 用户信息（openid、avatarFileID、avatarUrl、nickName、phoneNumber等）
 */
export async function updateUserInfo(userInfo) {
    const { openid, ...otherInfo } = userInfo;
    const docUsersModel = model()[DATA_MODEL_KEY.USER];
    if (!docUsersModel) throw new Error(`模型不存在：${DATA_MODEL_KEY.USER}`);
    // TODO 待删除调试
    console.log(`111更新用户openid=${openid}其他信息=${otherInfo}`);
    // 修复：select 改为 JSON 对象格式（模型要求 select must be json）
    const existingUsers = await getAll({
        name: DATA_MODEL_KEY.USER,
        filter: { _openid: openid },
        select: { _id: true }, // 正确格式：仅查询 _id 字段，优化性能
    });
    console.log(`查询用户openid=${openid}:existingUsers=${existingUsers}`);
    for (const user of existingUsers) {
        console.log(`用户openid=${openid}存在user=${user}`);
    }

    if (existingUsers.length > 0) {
        // 已存在：调用模型更新方法
        const docID = existingUsers[0]._id;
        // TODO 待删除调试
        console.log(`已存在用户docID=${docID}`);
        await docUsersModel.update({
            filter: { _id: docID , _openid: openid },
            data: {
                ...otherInfo,
                updateTime: new Date(), // 覆盖时间字段，确保更新
            },
        });
        console.log(`模型更新成功：用户openid=${openid}`);
    } else {
        // 不存在：调用模型新增方法（补充基础字段默认值，避免模型校验失败）
        await docUsersModel.save({
            data: {
                nickName: '默认昵称',
                phoneNumber: '',
                avatarUrl: '',
                avatarFileID: '',
                createTime: new Date(),
                updateTime: new Date(),
                ...otherInfo, // 覆盖头像相关字段
            },
        });
        console.log(`模型新增成功：用户openid=${openid}`);
    }
}
