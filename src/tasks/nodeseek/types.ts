// 签到响应
export interface SignResp {
  // 当失败时，将只剩 message 消息
  success: boolean
  // "今天的签到收益是3个鸡腿"
  message: string

  // 3
  gain: number
  // 225
  current: number
}

// 通知响应
export interface NotifyResp {
  // true
  success: boolean,
  unreadCount: {
    // 0
    all: number
    // 0
    message: number
    // 0
    atMe: number
    // 0
    reply: number
  }
}
