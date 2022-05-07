import {request} from "do-utils/dist/utils"
import type {FavOnlineResp, RoomStatus} from "./types"
import type React from "react"
import type {DoSnackbarProps} from "do-comps"

const TAG = "[ZuJi]"

// API
const friendApi = "https://appgw-el.yunuo365.cn/v2/friendcircle"
// 请求头
const headers = {
  "Host": "appgw-el.yunuo365.cn",
  "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
  "User-Agent": "yipinlive 6.0.0 rv:220129000 gy Release (iPhone XR; iOS 15.3.1; zh_CN)",
  "Accept-Language": "zh-Hans-CN;q=1.0",
}

// 获取直播间的状态信息
export const getRoomsStatus = async (ssid: string,
                                     setRooms: React.Dispatch<React.SetStateAction<RoomStatus[] | undefined>>,
                                     showSb: (ps: DoSnackbarProps) => void) => {
  // 分页获取
  let start = 0
  let step = 100

  // 获取，完成后退出
  while (true) {
    // 每一次网络请求后，调用一次回调 callback() 处理主播信息
    let data = `count=${step}&sessionid=${ssid}&start=${start}`
    // 执行请求、解析数据
    let response = await request(friendApi, data, {headers: headers})
    let text = await response.text()
    // 先替换小数为字符串，以免损失精度
    text = text.replace(/"gps_latitude":\s*([\d.]+)/, '"gps_latitude": "$1"')
    text = text.replace(/"gps_longitude":\s*([\d.]+)/, '"gps_longitude": "$1"')
    let obj: FavOnlineResp = JSON.parse(text)

    if (obj.reterr) {
      console.log(TAG, "获取关注的主播列表时出错：", obj.reterr)
      showSb({open: true, severity: "error", message: "获取关注的主播列表时出错"})
      return
    }

    // 本次请求没有主播在线
    if (obj.retinfo.objects.length == 0) {
      setRooms(prev => prev ? [...prev] : [])
      return
    }

    for (let item of obj.retinfo.objects) {
      item.content.type = item.type
      setRooms(prev => prev ? [...prev, item.content] : [item.content])
    }

    if (obj.retinfo.count < step) {
      console.log(TAG, "已读取关注的主播列表")
      showSb({open: true, severity: "success", message: "已读取关注的主播列表"})
      break
    }

    start += 100
  }
}