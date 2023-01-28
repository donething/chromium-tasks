/**
 * 京东下单
 * 暂不可用！只能成功加入购物车，无法自动下单。
 * 暂时还得用 chromium-ext 的扩展功能下单
 */

import {request} from "do-utils"
import {pushCardMsg} from "../comm/push"
import {notify} from "do-utils"
import cheerio from "cheerio"
import {noIconUrl} from "../comm/utils"

export const JD = {
  TAG: "[JD]",

  /**
   * 订购商品
   * @param pid 商品 ID。商品页面的地址栏中的一串数字
   * @param area 地区编号。获取参数：进入商品页面，打开 Chrome console，选择“网络”标签，刷新页面，
   * 在请求地址列表栏，输入"stock"后回车搜索，找到"stocks?callback=..."的请求，地区ID就在URL内
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
      pushCardMsg(`${this.TAG} 检查商品有货时出错`,
        JSON.stringify(stockObj, null, 2), pURL, "查看商品")
      return
    }

    // 有货
    console.log(this.TAG, "关注的商品已有货：", pURL)

    // 加入购入车
    let toCartURL = `https://cart.jd.com/gate.action?pid=${pid}&pcount=1&ptype=1`
    let toCardResp = await request(toCartURL, {})
    let toCardText = await toCardResp.text()

    if (toCardText.indexOf("商品已成功加入购物车") >= 0) {
      console.log(this.TAG, `商品已加入购物车`, pURL)
    } else {
      console.log(this.TAG, `将商品加入购入车时出错`, pURL, toCardText)
      pushCardMsg(`${this.TAG} 将商品加入购入车时出错`, "请注意", pURL, "查看商品")
      return
    }

    notify({
        title: "关注的商品已加入购物车",
        message: "需要手动下订单。注意订单总金额！",
        iconUrl: noIconUrl,
        buttons: [{title: "去下订单"}]
      }, [() =>
        chrome.tabs.create({url: "https://trade.jd.com/shopping/order/getOrderInfo.action"})
      ]
    )
    // pushCardMsg(`${this.TAG} 关注的商品已有货`, "可以去购买了", pURL, "查看商品")

    // 订单信息
    let orderInfoUrl = "https://trade.jd.com/shopping/order/getOrderInfo.action"
    let orderInfoResp = await request(orderInfoUrl)
    let $ = cheerio.load(await orderInfoResp.text())
    let goodsName = $(".goods-msg .p-name a").first().text().trim()
    let payment = $("span#sumPayPriceId").text().trim()
    let sendAddr = $("span#sendAddr").text().trim()
    let sendMobile = $("span#sendMobile").text().trim()
    console.log(this.TAG, "=========== 订单详情 ===========")
    console.log(this.TAG, "商品名：", goodsName)
    console.log(this.TAG, "总金额：", payment)
    console.log(this.TAG, sendAddr)
    console.log(this.TAG, sendMobile)

    // 购买
    let toOrderUrl = `https://trade.jd.com/shopping/order/submitOrder.action`
    let toOrderResp = await request(toOrderUrl, "overseaPurchaseCookies=&vendorRemarks=[]&" +
      "submitOrderParam.sopNotPutInvoice=false&submitOrderParam.trackID=TestTrackId&" +
      "presaleStockSign=1&submitOrderParam.ignorePriceChange=0&submitOrderParam.btSupport=0&" +
      "submitOrderParam.fp=28972dbf189e87d45b52d0cfe187f64a&" +
      "submitOrderParam.jxj=1&submitOrderParam.zpjd=1")
    let toOrderObj = await toOrderResp.json()
    console.log(this.TAG, "下单结果", toOrderObj)
  }
}