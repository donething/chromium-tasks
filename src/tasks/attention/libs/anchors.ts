import {request, notify} from "do-utils"
import IconHuya from "../../../icons/huya.svg"
import IconDouyu from "../../../icons/douyu.svg"
import IconDouyin from "../../../icons/douyin.svg"
import IconBili from "../../../icons/bili.svg"
import cheerio from "cheerio"
import type {DoLItemProps} from "do-comps"
import type {AItemType} from "../attentions"

// 主播的工具类
//
// 使用：
// import {anchor} from "../tasks/attention/libs/anchors_bg"
//
// anchor.AnchorUtils.monitor()

export namespace anchor {
  const TAG = "[Anchor]"

  // 主播平台
  // 此处的值需与 StatusUtils 中的属性对应，包括大小写
  export type Plat = "bili" | "douyin" | "douyu" | "huya"

  // 主播的基础信息
  export class Basic {
    // 是否准许检测
    enable?: boolean
    // 主播ID/房间号
    id: string
    // 新的主播ID/房间号，用于以新ID获取详细信息
    idNew?: string
    // 平台
    plat: Plat

    constructor({enable = undefined, plat, id}: Basic) {
      this.enable = enable
      this.id = id
      this.plat = plat
    }
  }

  // 主播的状态信息（需联网获取）
  export class Status {
    // 头像
    avatar?: string
    // 直播页面
    liveUrl: string
    // 主播名/房间名
    name: string
    // 是否在线，0：离线；1：在线：2：录播/回放
    online?: number
    // 直播间的标题
    title?: string

    constructor({avatar, liveUrl, name, online, title}: Status) {
      this.avatar = avatar
      this.liveUrl = liveUrl
      this.name = name
      this.online = online
      this.title = title
    }
  }

  // 主播平台的信息和操作
  export const StatusUtils = {
    // 斗鱼
    douyu: {
      // 网站图标
      favicon: IconDouyu,
      /**
       * 获取主播的状态信息
       * @param  basic 主播的基础信息
       * @return 主播的详细信息
       * @see http://open.douyucdn.cn/api/RoomApi/room/5068351
       */
      check: async (basic: Basic): Promise<Status> => {
        // 解析数据
        let resp = await request(`https://open.douyucdn.cn/api/RoomApi/room/${basic.id}`)
        let result = await resp.json()

        if (result === "Not Found") {
          console.log(TAG, `${basic.plat} 不存在该主播 ${basic.id}`)
          return new Status({
            name: "不存在主播",
            title: `${basic.plat} ${basic.id}`,
            liveUrl: `https://www.douyu.com/${basic.id}`
          })
        }

        // 提取数据
        let data: Status = {
          avatar: result.data.avatar,
          liveUrl: `https://www.douyu.com/${basic.id}`,
          name: result.data.owner_name,
          // room_status为"1"：在播，为"2"：离线
          online: result.data.room_status === "1" ? 1 : 0,
          title: result.data.room_name
        }

        return new Status(data)
      }
    },

    // 虎牙
    huya: {
      favicon: IconHuya,
      /**
       * 获取主播的详细信息
       * @param  basic 主播的基础信息
       * @return 主播的详细信息
       */
      check: async (basic: Basic): Promise<Status> => {
        let resp = await request(`https://www.huya.com/${basic.id}`)
        let text = await resp.text()

        if (text.indexOf("找不到这个主播") >= 0) {
          console.log(TAG, `${basic.plat} 不存在该主播 ${basic.id}`)
          return new Status({
            name: "不存在主播",
            title: `${basic.plat} ${basic.id}`,
            liveUrl: `https://www.huya.com/${basic.id}`
          })
        }

        // 解析为DOM，读取数据
        let $ = cheerio.load(text)
        let name = $(".host-name").text().trim()
        // 虎牙网页中body元素的class名包含了开播信息：liveStatus-on、liveStatus-off、liveStatus-replay
        let statusInfo = $("body").attr("class") || ""
        let online = 0
        if (statusInfo.indexOf("liveStatus-on") >= 0) {
          online = 1
        } else if (statusInfo.indexOf("liveStatus-replay") >= 0) {
          online = 2
        }

        let avatar = $(".host-pic #avatar-img").attr("src")
        let title = $(".host-title").text().trim()

        return new Status({
          avatar,
          liveUrl: "https://www.huya.com/" + basic.id,
          name,
          online,
          title
        })
      }
    },

    // 哔哩哔哩
    bili: {
      favicon: IconBili,
      /**
       * 获取主播的状态信息
       * @param basic 主播的基础信息
       * @return 主播的详细信息
       * @see https://github.com/SocialSisterYi/bilibili-API-collect/blob/master/live/info.md
       */
      check: async (basic: Basic): Promise<Status> => {
        // 该API请求不能包含cookie，所以请求头的"credentials"设为"omit"
        let url = "https://api.live.bilibili.com/room/v1/Room/get_status_info_by_uids"
        // 请求该 API 不能携带认证信息
        let resp = await request(url, {"uids": [basic.id]}, {credentials: "omit"})
        let result = await resp.json()

        // 没有该主播的信息
        if (!result.data || result.data.length === 0) {
          console.log(TAG, `${basic.plat} 不存在该主播 ${basic.id}`)
          return new Status({
            name: "不存在主播",
            title: `${basic.plat} ${basic.id}`,
            // 因为 basic 的 id 为用户 id，而不是房间号，获取状态出错时不能知道其房间号，所以访问首页
            liveUrl: `https://space.bilibili.com/${basic.id}/`
          })
        }

        return new Status({
          avatar: result.data[basic.id].face,
          liveUrl: "https://live.bilibili.com/" + result.data[basic.id].room_id,
          name: result.data[basic.id].uname,
          online: result.data[basic.id].live_status,
          title: result.data[basic.id].title
        })
      }
    },

    // 抖音
    douyin: {
      favicon: IconDouyin,
      /**
       * 获取主播的状态信息
       * @param basic 主播的基础信息
       * @return 主播的详细信息
       * @see https://github.com/wbt5/real-url/blob/master/douyin.py
       * @see https://github.com/linpinger/livedownloader/blob/master/DouYin_Live.ahk
       */
      check: async (basic: Basic): Promise<Status> => {
        // 优先以主播的新ID获取信息
        let url = "https://webcast-hl.amemv.com/webcast/room/reflow/info/?app_id=1128&live_id=1&room_id=" +
          (basic.idNew || basic.id)
        let resp = await request(url)
        let text = await resp.text()

        let getNot = (id: string = "") => {
          return new Status({
            name: "获取的主播信息为空",
            title: `${basic.plat} ${basic.id}`,
            liveUrl: `https://www.douyin.com/${id}`
          })
        }

        // 获取的内容可能为空，不能直接用 json() 解析，需要先判断
        if (text === "") {
          console.log(TAG, `${basic.plat} 获取主播(${basic.idNew || basic.id})的信息为空`)
          return getNot()
        }

        // 解析数据
        let result = JSON.parse(text)

        if (!result?.data?.room) {
          console.log(TAG, `${basic.plat} 不存在该主播 ${basic.idNew || basic.id}`)
          return getNot(result?.data?.room?.owner?.sec_uid || "未知用户")
        }

        let name = result?.data?.room?.owner?.nickname
        let ownRoom = result?.data?.room?.owner?.own_room

        // 因为主播的房间号经常自动改变，不过返回的信息里有新的的房间号，所以新号码再次请求
        if (ownRoom && (basic.idNew || basic.id) !== ownRoom.room_ids_str[0]) {
          basic.idNew = result.data.room.owner.own_room.room_ids_str[0]
          console.log(TAG, `抖音主播"${name}"的房间ID已更新为"${basic.idNew}"，将重新获取直播流`)
          return await StatusUtils[basic.plat].check(basic)
        }

        // data.room.status: 4:off, 2:on, 3:可能是暂时离开
        // 或者包含own_room(且room_ids与room_id相等)表示在线
        // room.status的判断并不准确
        // let status = result.data.room.status
        // 因为room_ids中的房间号为长整数而被截断，导致无法正确地与room_ids_str中的字符串房间号进行比较
        // let status = !(!own_room || own_room.room_ids[0].toString() !== own_room.room_ids_str[0])
        let status = ownRoom ? 1 : 0

        // 在本人网络环境中，hls_pull_url 不卡，而rtmp_pull_url很卡，但是rtmp的延时比hls低
        // let liveURL = result.data.room.stream_url.flv_pull_url.FULL_HD1
        // liveURL = liveURL ? liveURL : result.data.room.stream_url.rtmp_pull_url
        let liveURL = result.data.room.stream_url.hls_pull_url
        let title = result.data.room.owner?.signature || result.data.room.title
        let avatar = result.data.room.owner?.avatar_thumb.url_list[0]

        return new Status({
          avatar: avatar,
          liveUrl: "potplayer://" + liveURL,
          name: name,
          online: status,
          title: title
        })
      }
    }
  }

  // 多条件排序函数
  // 可按需修改 比较的内容
  export const Sorts = {
    // 比较函数
    // 返回-1表示a排在b前面，返回1表示b排在a前面，返回0表示还无法判断顺序

    // 是否被标记
    isMarked: (a: DoLItemProps, b: DoLItemProps) => {
      // 状态相同则无法判断结果
      if (a.isMarked === b.isMarked) {
        return 0
      }

      // 其它情况得到排序结果
      if (a.isMarked) return -1
      if (b.isMarked) return 1
    },

    // 按是否在播排序
    online: (a?: boolean, b?: boolean) => {
      // 状态相同则无法判断结果
      if (a === b) {
        return 0
      }

      // 其它情况得到排序结果
      if (a) return -1
      if (b) return 1
    },
    // 按平台名排序
    plat: (a: string, b: string) => {
      return a.localeCompare(b)
    },
    // 按主播名/房间名排序
    name: (a?: string, b?: string) => {
      // 当name为空时无法得到结果，若只有一个项目有name属性时该项排在前面，都有name属性时正常比较
      if (a === undefined && b === undefined) return 0
      if (a === undefined) return 1
      if (b === undefined) return -1

      return a.localeCompare(b)
    }
  }

  // 工具类
  export const AnchorUtils = {
    // 检测主播是否在播
    // 直接调用这个函数即可
    monitor: async function () {
      // 读取 chromium 存储的数据
      let data = await chrome.storage.sync.get({attentions: {anchors: {}}})
      let anchors: AItemType<anchor.Basic> = data.attentions.anchors
      // 设置是否发送通知提醒
      let enableNotify = true
      if (anchors.enableNotify === false) {
        enableNotify = false
      }

      // 是否已禁用功能
      if (anchors.enable === false) {
        console.log(TAG, "检测主播在播功能已关闭")
        return
      }
      if (!anchors.list) {
        console.log(TAG, "主播列表为空，放弃检测是否在播")
        return
      }
      this.monitorAnchors(anchors.list, enableNotify).then(online => {
        // 设置图标角标
        // 使用then()，等待检测完所有主播信息后再改变角标
        chrome.action.setBadgeText({text: String(online)})
        chrome.action.setBadgeBackgroundColor({color: [25, 135, 0, 250]})
      })
    },

    /**
     * 主播是否在线
     * @param anchors 主播基础信息列表
     * @param enableNotify 是否准许通知
     * @returns 返回在线人数（排除不检测的主播），可在 .then()中执行获取完主播信息后的后续操作
     */
    monitorAnchors: async function (anchors: Array<Basic>, enableNotify: boolean): Promise<number> {
      // 每次开始检测前需要清空上次的计数
      let online = 0
      // 去除设置了不检测的主播
      anchors = anchors.filter(a => a.enable !== false)

      // 本次开播后是否已提醒了，若是，则知道下次开播前不发送通知
      // 若记录保存到 localstorage 中，需要每次首次运行时删除之前的，以免影响本次的提醒
      // https://stackoverflow.com/a/37850847/8179418
      let anchorsNOData = await chrome.storage.local.get({anchors_no: []})
      let hadNotify = new Set(anchorsNOData.anchors_no)

      // 开始检测
      for (let basic of anchors) {
        // 此处同步检查每个主播的状态，所以用 await 等待，以免发送通知时重叠
        let status = await StatusUtils[basic.plat].check(basic).catch(e => {
          console.log(TAG, "获取主播信息时出错：", basic, e)
        })

        // 获取信息时出错
        if (!status) {
          continue
        }

        let id = `${basic.plat}_${basic.id}`
        if (status.online === 1) {
          online++
          console.log(TAG, `主播"${status.name}"(${basic.id}) 在线`)

          // 需要发送通知
          if (enableNotify) {
            // 主播开播发送提醒后，一直到停播，期间都不需要发送提醒
            if (hadNotify.has(id)) {
              console.log(TAG, `本次"${status.name}"(${basic.id})的开播已提醒，此次不再提醒`)
              continue
            }
            let ops: chrome.notifications.NotificationOptions = {
              type: "basic",
              title: "关注的主播已开播",
              message: `"${status.name}"(${basic.id})`,
              iconUrl: "/icons/extension_128.png",
              buttons: [{title: "打开"}, {title: "取消"}]
            }
            let liveUrl = status.liveUrl
            notify(ops, [
              function () {
                chrome.tabs.create({url: liveUrl})
              }
            ])

            hadNotify.add(id)
          }
        } else {
          console.log(TAG, `主播"${status.name}"(${basic.id}) 未在线`)
          // 移除过期的通知记录
          hadNotify.delete(id)
        }
      }

      // 保存通知记录
      chrome.storage.local.set({anchors_no: [...hadNotify]})

      // 返回在线人数
      return online
    }
  }
}