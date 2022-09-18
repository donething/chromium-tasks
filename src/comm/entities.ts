// 业务函数返回的数据
export class JResult<T> {
  // 是否成功，0 表示成功
  code?: number
  // 消息
  msg?: string
  // 传递的数据
  data?: T

  constructor(code: number, msg?: string, data?: T) {
    this.code = code
    this.msg = msg
    this.data = data
  }
}

