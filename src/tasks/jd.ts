// 领取京东的京豆
import {request} from "do-utils"
import {pushCardMsg} from "../comm/push"
import {notify} from "do-utils/dist/elem"

export const JD = {
  TAG: "[JD]",

  sign: async function () {
    let total = 0
    // 签到的京豆
    let url = "https://api.m.jd.com/client.action?functionId=signBeanIndex&" +
      "body=%7B%22monitor_refer%22%3A%22%22,%22rnVersion%22%3A%223.9%22,%22fp%22%3A%22-1%22," +
      "%22shshshfp%22%3A%22-1%22,%22shshshfpa%22%3A%22-1%22,%22referUrl%22%3A%22-1%22," +
      "%22userAgent%22%3A%22-1%22,%22jda%22%3A%22-1%22,%22monitor_source%22%3A%22bean_m_bean_index%22%7D&" +
      "appid=ld&client=android&clientVersion=null&networkType=null&osVersion&uuid=null&" +
      `jsonp=jsonp_${Date.now()}_89861`
    let resp = await request(url)
    let result = await resp.json()
    let dataStr = result.body.substring(result.body.indexOf("(") + 1, result.body.lastIndexOf(")"))
    let obj = JSON.parse(dataStr)
    if (obj.data.dailyAward.title === "签到成功") {
      total += parseInt(obj.data.dailyAward.beanAward.beanCount)
    } else if (obj.data.dailyAward.title === "今天已签到") {
      // 重复签到
    } else {
      console.log(this.TAG, "领取签到的京豆出错：", result.body)
    }

    // 转盘
  },

  /**
   * 订购商品
   * @param pid 商品 ID
   * @param area 地区编号
   * @description 参数获取：打开 Chrome console，刷新商品页面，按`Ctrl+Shift+F`，输入"stock"后回车搜索
   * @see https://github.com/shaodahong/dahong/issues/13
   */
  order: async function (pid: string, area: string) {
    // 商品链接
    let pURL = `https://item.jd.com/${pid}.html`

    // 是否有货
    let stockURL = `https://item-soa.jd.com/getWareBusiness?skuId=${pid}&area=${area}`
    let stockResp = await request(stockURL)
    let stockObj = await stockResp.json()
    if (stockObj.stockInfo.stockDesc.indexOf("无货") >= 0) {
      console.log(this.TAG, "商品还没货，无法购买", pURL)
      return
    }
    if (stockObj.stockInfo.stockDesc.indexOf("有货") === -1) {
      console.log(this.TAG, "检查商品有货时出错：", pURL, stockObj)
      pushCardMsg(`${this.TAG} 检查商品有货时出错`, JSON.stringify(stockObj, null, 2),
        pURL, "查看商品")
      return
    }
    // 有货
    console.log(this.TAG, "关注的商品已有货：", pURL)
    chrome.tabs.create({url: `https://cart.jd.com/gate.action?pid=${pid}&pcount=1&ptype=1`})
    notify({
      title: "关注的商品已有货",
      message: "可以去购买了",
      iconUrl: chrome.runtime.getURL("/icons/extension_48.png"),
      buttons: [{title: "查看商品"}]
    }, [() => chrome.tabs.create({url: pURL})])

    pushCardMsg(`${this.TAG} 关注的商品已有货`, "可以去购买了", pURL, "查看商品")
    return


    // 加入购入车
    let toCartURL = `https://cart.jd.com/tproduct?pid=${pid}&rid=${Math.random()}`
    let toCardResp = await request(toCartURL, {})
    let toCardObj = await toCardResp.json()
    if (toCardObj && toCardObj.success && toCardObj.lastAddedSku) {
      console.log(this.TAG, `已将“${toCardObj.lastAddedSku.name}”加入购物车`, pURL)
    } else {
      console.log(this.TAG, `将商品加入购入车时出错`, pURL, toCardObj)
      pushCardMsg(`${this.TAG} 将商品加入购入车时出错`, JSON.stringify(toCardObj, null, 2),
        pURL, "查看商品")
      return
    }
  },
}