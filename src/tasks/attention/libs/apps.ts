// 应用的工具类
import {request, WXQiYe, notify} from "do-utils"
import IconAppstore from "../../../icons/appstore.svg"
import IconPlaystore from "../../../icons/playstore.svg"
import {pushCardMsg} from "../../../comm/push"
import type {AItemType} from "../attentions"

export namespace app {
  const TAG = "[Apps]"

  // 应用平台
  // 此处的值需与 StatusUtils 中的属性对应，包括大小写
  export type Plat = "appstore" | "playstore"

  // 应用地区
  export type Area = "CN" | "US"

  // 应用的基础信息
  export class Basic {
    // 应用所在的地区
    area: Area
    // 是否准许检测
    enable?: boolean
    // 应用的ID，Apple商店为数字ID，Google商店为包名
    id: string
    // 平台
    plat: Plat

    constructor({area, enable = undefined, id, plat}: Basic) {
      this.area = area
      this.enable = enable
      this.id = id
      this.plat = plat
    }
  }

  // 应用的状态信息（需联网获取）
  export class Status {
    // 应用的包名，如"a.b.c"
    bundleId?: string
    // 货币类型，如"CNY"
    currency?: string
    // 应用描述
    description?: string
    // 应用的大小（字节）
    fileSizeBytes?: number
    // 格式化的价格，如"¥1.00"
    formattedPrice?: string
    // 应用图标
    icon?: string
    // 应用名
    name: string
    // 应用价格
    price?: number
    // 应用ID
    trackId?: number
    // 应用的版本，如 "3.6.9"
    version?: string
    // 应用的链接
    viewURL?: string

    constructor({
                  bundleId, currency, description, fileSizeBytes, formattedPrice, icon, name,
                  price, trackId, version, viewURL
                }: Status) {
      this.bundleId = bundleId
      this.currency = currency
      this.description = description
      this.fileSizeBytes = fileSizeBytes
      this.formattedPrice = formattedPrice
      this.icon = icon
      this.name = name
      this.price = price
      this.trackId = trackId
      this.version = version
      this.viewURL = viewURL
    }
  }

  // 主播平台的信息和操作
  export const StatusUtils = {
    // Apple 应用商店
    appstore: {
      favicon: IconAppstore,
      /**
       * 检测 AppStore 商店的应用
       * @param basic 应用的基础信息
       * @return 应用的详细信息
       */
      check: async (basic: Basic): Promise<Status> => {
        // 请求应用信息的数据
        let url = `https://itunes.apple.com/lookup?country=${basic.area}&id=${basic.id}`
        let resp = await request(url)
        let result = await resp.json()

        // 解析信息
        if (result["resultCount"] === 0) {
          let viewURL = `https://apps.apple.com/${basic.area}/app/id${basic.id}`
          return {viewURL: viewURL, name: `未知的ID：${basic.id}`}
        }

        return new Status({
          name: result.results[0]["trackName"],
          description: result.results[0]["description"],
          trackId: result.results[0]["trackId"],
          icon: result.results[0]["artworkUrl100"],
          price: result.results[0]["price"],
          currency: result.results[0]["currency"],
          formattedPrice: result.results[0]["formattedPrice"],
          bundleId: result.results[0]["bundleId"],
          fileSizeBytes: result.results[0]["fileSizeBytes"],
          viewURL: result.results[0]["trackViewUrl"],
          version: result.results[0]["version"]
        })
      }
    },

    // Google 应用商店
    playstore: {
      favicon: IconPlaystore,
      /**
       * 检测 PlayStore 商店的应用
       * @param basic 应用的基础信息
       * @return 应用的详细信息
       */
      check: async (basic: Basic): Promise<Status> => {
        let status = {name: `${basic.id}`}
        return new Status(status)
      }
    }
  }

  // 工具类
  export const AppUtils = {
    /**
     * 定时检测
     */
    monitor: async function monitor() {
      // 获取 chromium 存储的数据
      let data = await chrome.storage.sync.get({attentions: {apps: {}}})
      let apps: AItemType<app.Basic> = data.attentions.apps
      if (apps.enable === false) {
        console.log(TAG, "检测应用价格功能已关闭")
        return
      }
      if (!apps.list) {
        console.log(TAG, "应用列表为空，放弃检测价格")
        return
      }

      // 遍历应用列表，获取详细信息
      for (let basic of apps.list) {
        // 根据平台选择获取信息的方法
        let status = await StatusUtils[basic.plat].check(basic).catch(e => {
          console.error(TAG, "获取应用信息出错：", basic, e)
        })

        // 获取信息时出错
        if (!status) {
          continue
        }

        // 应用还没有免费
        if (status.price !== 0) {
          console.log(TAG, `关注的应用"${status.name}"(${basic.id})的价格：${status.formattedPrice}`)
          continue
        }

        // 应用已免费，发送通知
        console.log(TAG, `关注的应用"${status.name}"(${status.trackId}) 已免费`)

        let ops: chrome.notifications.NotificationOptions = {
          type: "basic",
          title: "关注的应用 已免费",
          message: `"${status.name}"(${basic.id})`,
          iconUrl: "/icons/extension_128.png",
          buttons: [{title: "打开"}, {title: "取消"}]
        }
        let liveUrl = status.viewURL
        notify(ops, [
          function () {
            chrome.tabs.create({url: liveUrl})
          }
        ])

        // 推送消息
        pushCardMsg(
          "关注的应用已免费",
          `${WXQiYe.MsgCard.genHighlightText(status.name)}\n应用 ID: ${status.trackId}`,
          status.viewURL || "",
          "去下载"
        )
      }
    }
  }
}