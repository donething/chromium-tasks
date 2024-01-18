import type {NotifyResp, SignResp} from "./types"
import {notify} from "do-utils"
import {noIconUrl} from "../../comm/utils"

const TAG = "[nodeseek]"

// 签到
const sign = async () => {
  const resp = await fetch("https://www.nodeseek.com/api/attendance?random=true", {
    "referrer": "https://www.nodeseek.com/board",
    "body": null,
    "method": "POST",
  })

  const obj: SignResp = await resp.json()

  if (!obj.success) {
    if (obj.message.includes("请勿重复操作")) {
      console.log(TAG, "重复签到：", obj.message)
      return
    }

    console.log(TAG, "签到失败：", obj.message)
    notify({title: `${TAG} 签到失败`, message: obj.message, iconUrl: noIconUrl})
    return
  }

  console.log(TAG, "签到成功：", obj.message)
}

// 检查通知
const checkNotify = async () => {
  const resp = await fetch("https://www.nodeseek.com/api/notification/unread-count")
  const obj: NotifyResp = await resp.json()

  if (!obj.success) {
    console.log(TAG, "检查通知失败：", obj)
    notify({title: `${TAG} 检查通知失败`, message: JSON.stringify(obj), iconUrl: noIconUrl})
    return
  }

  if (obj.unreadCount.all === 0) {
    console.log(TAG, "没有新通知")
    return
  }

  // 打开通知网页时跳转到存在新通知的页面
  const hash = obj.unreadCount.atMe ? "/atMe" :
    obj.unreadCount.reply ? "/reply" : "/message?mode=list"

  console.log(TAG, `有 ${obj.unreadCount.all} 条新通知`, "已发送提醒")
  notify({
    title: `${TAG} 有新通知`,
    message: `有 ${obj.unreadCount.all} 条新通知`,
    iconUrl: noIconUrl,
    buttons: [
      {title: "打开网页"}
    ]
  }, [
    () => chrome.tabs.create({url: `https://www.nodeseek.com/notification#${hash}`})
  ])
}

const Nodeseek = {sign, checkNotify}

export default Nodeseek
