import {request} from "do-utils"
import type {FavOnlineResp, RoomStatus} from "./types"
import {JResult} from "../../comm/entities"

// 获取直播间的状态信息
export const getRoomsStatus = async (ssid: string, host: string): Promise<JResult<Array<RoomStatus>>> => {
  // 分页获取
  let start = 0
  let step = 100

  // 请求头
  const headers = {
    "Host": host.substring(host.lastIndexOf("/") + 1),
    "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
    "User-Agent": "yipinlive 6.0.0 rv:220129000 gy Release (iPhone XR; iOS 15.3.1; zh_CN)",
    "Accept-Language": "zh-Hans-CN;q=1.0",
  }

  // 保存主播在线数据，以返回
  const data: Array<RoomStatus> = []
  // 获取，完成后退出
  while (true) {
    // 每一次网络请求后，调用一次回调 callback() 处理主播信息
    let postData = `count=${step}&sessionid=${ssid}&start=${start}`
    // 执行请求、解析数据
    let url = `${host}/v2/friendcircle`
    let response = await request(url, postData, {headers: headers})
    let text = await response.text()
    // 先替换小数为字符串，以免损失精度
    text = text.replace(/"gps_latitude":\s*([\d.]+)/, '"gps_latitude": "$1"')
    text = text.replace(/"gps_longitude":\s*([\d.]+)/, '"gps_longitude": "$1"')
    let obj: FavOnlineResp = JSON.parse(text)

    if (obj.reterr) {
      return new JResult<Array<RoomStatus>>(1000, `获取主播列表出错：${obj.reterr}`)
    }

    // 本次请求没有主播在线
    if (obj.retinfo.objects.length == 0) {
      break
    }

    // 添加
    for (let item of obj.retinfo.objects) {
      item.content.type = item.type
      data.push(item.content)
    }

    // 已完成读取关注的主播列表
    if (obj.retinfo.count < step) {
      break
    }

    start += 100
  }

  return new JResult<Array<RoomStatus>>(0, "已读取所有主播的在线状态", data)
}