import {notify, request} from "do-utils"
import {noIconUrl} from "../comm/utils"

/**
 * hdtime.org PT站的任务
 *
 * 使用：需先登录网站
 */
export const HDTime = {
  TAG: "[HDTime]",
  /**
   * 签到
   */
  sign: async function () {
    const resp = await request("https://hdtime.org/attendance.php")
    const text = await resp.text()

    if (text.indexOf("签到成功") === -1) {
      console.log(this.TAG, "签到失败：", text)
      notify({title: this.TAG, message: "签到失败。可在扩展控制台中查看详细信息", iconUrl: noIconUrl})
    }

    console.log(this.TAG, "签到成功")
  }
}