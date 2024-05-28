import {JD} from "../tasks/jd"
import Nodeseek from "../tasks/nodeseek/nodeseek"
import Sht from "../tasks/sht/sht"
import RuleActionType = chrome.declarativeNetRequest.RuleActionType
import HeaderOperation = chrome.declarativeNetRequest.HeaderOperation
import ResourceType = chrome.declarativeNetRequest.ResourceType
import {notify} from "do-utils"
import {noIconUrl} from "../comm/utils"

// 持久存储的数据
interface Data {
  // 浏览器的当次启动的时间戳（毫秒）
  startup: number
}

// 持久存储数据的键
const KEY = "sw"

// 监听定时
chrome.alarms.onAlarm.addListener(async alarm => {
  switch (alarm.name) {
    case "oneMin":
      console.log("开始执行每分钟周期的任务")
      Nodeseek.checkNotify()
      break

    case "threeMin":
      console.log("开始执行每3分钟周期的任务")
      // 主播
      // anchor.AnchorUtils.monitor()
      // 应用
      // app.AppUtils.monitor()
      break

    case "halfhour":
      console.log("开始执行每半小时周期的任务")
      // 回帖
      // 因为 Alarm 机制，避免因关闭而错过时间后立即执行，导致和签到重复回帖，所以判断启动几分钟后才执行任务
      const payload = await chrome.storage.sync.get({[KEY]: {}})
      const data: Data = payload[KEY]

      if (Date.now() - (data.startup || 0) >= 3 * 60 * 1000) {
        Sht.replyFirstThread("刷分").catch(result => {
          console.log(`${Sht.TAG} 回帖失败：`, result)
          notify({title: `${Sht.TAG} 回帖失败`, message: result.toString(), iconUrl: noIconUrl})
        })
      } else {
        console.log(`${Sht.TAG} 距离启动时间太短，此次不刷分`)
      }

      break

    case "jd":
      console.log(JD.TAG, `开始执行JD定时任务`)
      // await JD.order("10061537500663", "19_1607_47387_59093")
      break
  }
})

chrome.runtime.onInstalled.addListener(async () => {
  // 修改网络的请求头等信息
  initDeclarativeNet()

  // 每分钟执行任务
  chrome.alarms.create("oneMin", {delayInMinutes: 1, periodInMinutes: 1})
  // 每3分钟执行任务
  chrome.alarms.create("threeMin", {delayInMinutes: 1, periodInMinutes: 3})
  // 每半小时执行任务
  chrome.alarms.create("halfhour", {delayInMinutes: 1, periodInMinutes: 30})

  // 定时执行
  // chrome.alarms.create("jd", {when: new Date("2022/04/01 10:00:00").getTime()})
})

// 每次运行浏览器时执行
chrome.runtime.onStartup.addListener(async () => {
  // 存储浏览器本地的启动时间
  const payload = await chrome.storage.sync.get({[KEY]: {}})
  const data: Data = payload[KEY]
  data.startup = Date.now()
  await chrome.storage.sync.set({[KEY]: data})

  // 因为 manifest mv3 对 service worker 的运行时间有限制，所以打开一个扩展页面绕过限制
  // chrome.tabs.query({url: `chrome-extension://${chrome.runtime.id}/*`}, tabs => {
  //   if (tabs.length === 1 && tabs[0].id) {
  //     chrome.tabs.remove(tabs[0].id)
  //   }
  //   console.log("打开扩展页面，绕过 service worker 的运行时间限制")
  //   chrome.tabs.create({url: "/index.html#/tasks"})
  // })

  // hdsay
  // HDSay.startTask()

  // hdtime
  // HDTime.sign()

  // nodeseek
  Nodeseek.sign().catch(result => {
    console.log(`${Nodeseek.TAG} 签到失败：`, result)
    notify({title: `${Nodeseek.TAG} 签到失败`, message: result.toString(), iconUrl: noIconUrl})
  })

  // sht 签到
  Sht.sign().catch(result => {
    console.log(`${Sht.TAG} 签到失败：`, result)
    notify({title: `${Sht.TAG} 签到失败`, message: result.toString(), iconUrl: noIconUrl})
  })
})

/**
 * 修改网络请求头等
 * @see https://stackoverflow.com/a/72739149/8179418
 */
const initDeclarativeNet = () => {
  chrome.declarativeNetRequest.updateDynamicRules({
    // 先移除同名规则，避免重复添加
    removeRuleIds: [1],

    addRules: [
      {
        id: 1,
        priority: 1,
        action: {
          type: RuleActionType.MODIFY_HEADERS,
          requestHeaders: [
            {
              header: "Referer",
              operation: HeaderOperation.SET,
              value: "https://www.sehuatang.net"
            },
            {
              header: "Origin",
              operation: HeaderOperation.SET,
              value: "https://www.sehuatang.net"
            }
          ]
        },
        condition: {
          domains: [chrome.runtime.id],
          urlFilter: "|https://www.sehuatang.net",
          resourceTypes: [ResourceType.XMLHTTPREQUEST]
        }
      }
    ]
  }, () => {
    if (chrome.runtime.lastError) {
      console.log("执行 declarativeNetRequest 失败：", chrome.runtime.lastError)
    }
  })
}
