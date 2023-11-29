import {anchor} from "../tasks/attention/libs/anchors"
import {app} from "../tasks/attention/libs/apps"
import {HDSay} from "../tasks/hdsay"
import {JD} from "../tasks/jd"
import {HDTime} from "../tasks/hdtime"

// 监听定时
chrome.alarms.onAlarm.addListener(async alarm => {
  switch (alarm.name) {
    case "oneMin":
      console.log("开始执行每分钟周期的任务")
      break
    case "threeMin":
      console.log("开始执行每3分钟周期的任务")
      // 主播
      anchor.AnchorUtils.monitor()
      // 应用
      app.AppUtils.monitor()
      break
    case "halfhour":
      console.log("开始执行每半小时周期的任务")
      break
    case "jd":
      console.log(JD.TAG, `开始执行JD定时任务`)
      await JD.order("10061537500663", "19_1607_47387_59093")
      break
  }
})

chrome.runtime.onInstalled.addListener(async () => {
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
  // 因为 manifest mv3 对 service worker 的运行时间有限制，所以打开一个扩展页面绕过限制
  chrome.tabs.query({url: `chrome-extension://${chrome.runtime.id}/*`}, tabs => {
    if (tabs.length === 1 && tabs[0].id) {
      chrome.tabs.remove(tabs[0].id)
    }
    console.log("打开扩展页面，绕过 service worker 的运行时间限制")
    chrome.tabs.create({url: "/index.html#/tasks"})
  })

  // hdsay
  HDSay.startTask()

  // hdtime
  HDTime.sign()
})