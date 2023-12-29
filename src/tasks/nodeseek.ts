const TAG = "nodeseek"

// 签到响应
interface SignResp {
  // 当失败时，将只剩 message 消息
  success: boolean
  // "今天的签到收益是3个鸡腿"
  message: string

  // 3
  gain: number
  // 225
  current: number
}

// 签到
export const sign = async () => {
  const resp = await fetch("https://www.nodeseek.com/api/attendance?random=true", {
    "referrer": "https://www.nodeseek.com/board",
    "body": null,
    "method": "POST",
  })

  const obj: SignResp = await resp.json()

  if (!obj.success) {
    console.log(TAG, "签到失败：", obj.message)
    return
  }

  console.log(TAG, "签到成功：", obj.message)
}
