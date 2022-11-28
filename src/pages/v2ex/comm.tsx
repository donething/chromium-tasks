import React from "react"
import type {DoSnackbarProps} from "do-comps"
import Stack from "@mui/material/Stack"
import type {Resp, Topic} from "./types"
import {request} from "do-utils"
import {Typography} from "@mui/material"
import {CS_KEY_V2EX_TOPICS, V2exSets} from "./settings"

declare global {
  interface Window {
    // 传递到被打开的窗口，以显示主题
    viewedTopic: Topic
  }
}

// 间距
export const padLR1 = {
  paddingLeft: 1,
  paddingRight: 1
}
export const padLR2 = {
  paddingLeft: 2,
  paddingRight: 2
}

export const padTB1 = {
  paddingTop: 1,
  paddingBottom: 1
}
export const padTB2 = {
  paddingTop: 2,
  paddingBottom: 2
}

/**
 * 使用 API2.0 获取 V2ex 的内容
 *
 * 会自动增加授权码等数据，并解析、返回响应数据
 *
 * **不是 API2.0 的 URL 不要用此函数**
 */
export const get = async <T, >(url: string, data?: string | object | FormData,
                               showSb?: (ps: DoSnackbarProps) => void): Promise<T | undefined> => {
  // 读取 token 以请求数据
  let storage = await chrome.storage.sync.get({[CS_KEY_V2EX_TOPICS]: {}})
  let sets: V2exSets = storage[CS_KEY_V2EX_TOPICS]

  if (!sets.token) {
    console.log(`无法请求数据：API Token 为空`, url)
    return undefined
  }

  const headers = {
    "Authorization": `Bearer ${sets.token}`,
    "credentials": "omit"
  }

  // 增加时间参数，每次都向服务器请求新数据，避免浏览器从缓存中获取过时的数据
  let join: string
  if (url.indexOf("?") < 0) {
    join = "?"
  } else {
    join = "&"
  }

  let resp = await request(`${url}${join}t=${Date.now()}`, data,
    {headers: headers}).catch(e => {
    console.log(`请求数据出错：`, url, e)
    showSb && showSb({open: true, message: "请求数据出错", severity: "error"})
  })
  if (!resp) {
    return undefined
  }

  let json: Resp<T> = await resp.json().catch(e => {
    console.log("解析JSON数据出错：", url, e)
    showSb && showSb({open: true, message: "解析JSON数据出错", severity: "error"})
  })
  if (!json) {
    return undefined
  }

  if (!json.success) {
    console.log("获取数据失败：", url, json)
    showSb && showSb({open: true, message: `获取数据失败：${json.message}`, severity: "warning"})
    return undefined
  }

  return json.result
}

/**
 * 正在获取内容
 */
export const Loading = React.memo((ps: { children?: React.ReactNode }) => {
  return (
    <Stack margin={"50px auto"}>
      {ps.children || <Typography color={"#1976D2"}>正在获取内容…</Typography>}
    </Stack>
  )
})
