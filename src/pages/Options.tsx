import React, {useEffect, useState} from 'react'
import Card, {CardProps} from "@mui/material/Card"
import {CardHeader} from "@mui/material"
import CardContent from "@mui/material/CardContent"
import Button from "@mui/material/Button"
import {delRevoke, DoBackupPanelChromium, DoPasswdField, useSharedSnackbar} from "do-comps"
import CardActions from "@mui/material/CardActions"
import Stack from "@mui/material/Stack"
import Divider from "@mui/material/Divider"

// 微信 Token 的初始值
const wxTokenInit = {
  appid: "",
  secret: "",
  toUID: ""
}

// 微信 Token 组件
const WXToken = (props?: CardProps): JSX.Element => {
  // 需要保存的 token 信息
  const [wxToken, setWxToken] = useState(wxTokenInit)
  // 提示消息
  const {showSb} = useSharedSnackbar()

  // 仅在组件被导入时读取数据，组件有变动（重新渲染）时不执行
  useEffect(() => {
    // 读取存储的数据，显示
    chrome.storage.sync.get({settings: {}}).then(data => {
      console.log("读取存储的微信推送 Token")
      if (data.settings.wxToken) {
        setWxToken(data.settings.wxToken)
      }
    })
  }, [])

  return (
    <Card {...props}>
      <CardHeader title={"企业微信消息推送"}/>

      <Divider/>

      <CardContent sx={{display: "flex", flexFlow: "column nowrap", gap: 4}}>
        <DoPasswdField label="企业ID" value={wxToken.appid}
                       setObject={value => setWxToken(prev => ({...prev, appid: value}))}/>

        <DoPasswdField label="秘钥" value={wxToken.secret}
                       setObject={value => setWxToken(prev => ({...prev, secret: value}))}/>

        <DoPasswdField label="应用ID" value={wxToken.toUID}
                       setObject={value => setWxToken(prev => ({...prev, toUID: value}))}/>
      </CardContent>

      <Divider/>

      <CardActions>
        <Button color={"warning"} onClick={_ => {
          delRevoke<typeof wxTokenInit>("微信推送的Token", wxToken, async () => {
            // 删除输入框绑定的数据
            setWxToken(wxTokenInit)

            // 保存到 chromium storage
            let data = await chrome.storage.sync.get({settings: {}})
            data.settings.wxToken = undefined
            chrome.storage.sync.set({settings: data.settings}).then(() => {
              console.log("已删除 微信推送的 Token")
              showSb({open: true, message: "已删除 微信推送的 Token", severity: "success"})
            })
          }, async origin => {
            // 撤销删除
            // 恢复输入框绑定的数据
            setWxToken(origin)

            // 恢复数据到 chromium storage 中
            let data = await chrome.storage.sync.get({settings: {}})
            data.settings.wxToken = origin
            chrome.storage.sync.set({settings: data.settings}, () => {
              console.log("已恢复 微信推送的 Token")
              showSb({open: true, message: "已恢复 微信推送的 Token", severity: "success"})
            })
          }, showSb)
        }}>删除 Token</Button>

        <Button color={"primary"} onClick={async _ => {
          if (!wxToken.appid || !wxToken.secret || !wxToken.toUID) {
            showSb({open: true, message: "微信 Token 中部分信息为空", severity: "warning"})
            return
          }

          let data = await chrome.storage.sync.get({settings: {}})
          data.settings.wxToken = wxToken

          await chrome.storage.sync.set({settings: data.settings})
          console.log("已保存 微信推送的 Token")
          showSb({open: true, message: "已保存 微信推送的 Token", severity: "success"})
        }}>保存 Token</Button>
      </CardActions>
    </Card>
  )
}

// 选项组件
const Options = (): JSX.Element => {
  useEffect(() => {
    document.title = `选项 - ${chrome.runtime.getManifest().name}`
  }, [])

  return (
    <Stack direction={"row"} spacing={4}>
      <WXToken sx={{width: 300}}/>
      <DoBackupPanelChromium/>
    </Stack>
  )
}

export default Options
